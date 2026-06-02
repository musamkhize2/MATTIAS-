import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateAnalyticsReport,
  generateAndSendAnalyticsReport,
  scheduleWeeklyAnalyticsReport,
  scheduleMonthlyAnalyticsReport,
} from "./analyticsReportScheduler";
import * as db from "../db";
import * as mailerlite from "./mailerliteTransactional";
import * as notifications from "./notificationService";

// Mock dependencies
vi.mock("../db");
vi.mock("./mailerliteTransactional");
vi.mock("./notificationService");

describe("analyticsReportScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateAnalyticsReport", () => {
    it("should generate analytics report with campaign metrics", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "camp-1",
                name: "Campaign 1",
                recipientCount: 1000,
                sentCount: 950,
                openCount: 475,
                clickCount: 95,
              },
              {
                id: "camp-2",
                name: "Campaign 2",
                recipientCount: 500,
                sentCount: 480,
                openCount: 240,
                clickCount: 48,
              },
            ]),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-08");

      const report = await generateAnalyticsReport(1, startDate, endDate);

      expect(report.campaignCount).toBe(2);
      expect(report.totalEmails).toBe(1500);
      expect(report.sentCount).toBe(1430);
      expect(report.openCount).toBe(715);
      expect(report.clickCount).toBe(143);
      expect(report.openRate).toBeCloseTo(50, 1);
      expect(report.clickRate).toBeCloseTo(10, 1);
      expect(report.topCampaigns.length).toBe(2);
    });

    it("should handle empty campaign list", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-08");

      const report = await generateAnalyticsReport(1, startDate, endDate);

      expect(report.campaignCount).toBe(0);
      expect(report.totalEmails).toBe(0);
      expect(report.openRate).toBe(0);
      expect(report.clickRate).toBe(0);
    });

    it("should calculate correct rates", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "camp-1",
                name: "Campaign 1",
                recipientCount: 1000,
                sentCount: 1000,
                openCount: 250,
                clickCount: 50,
              },
            ]),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-08");

      const report = await generateAnalyticsReport(1, startDate, endDate);

      expect(report.openRate).toBe(25); // 250/1000 * 100
      expect(report.clickRate).toBe(5); // 50/1000 * 100
    });
  });

  describe("generateAndSendAnalyticsReport", () => {
    it("should generate and send analytics report", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "camp-1",
                name: "Campaign 1",
                recipientCount: 1000,
                sentCount: 950,
                openCount: 475,
                clickCount: 95,
              },
            ]),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });
      vi.mocked(notifications.notifyAnalyticsReport).mockResolvedValue({
        slack: true,
        email: true,
      });

      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-08");

      const result = await generateAndSendAnalyticsReport(1, "admin@example.com", startDate, endDate);

      expect(result).toBe(true);
      expect(mailerlite.sendTransactionalEmail).toHaveBeenCalled();
      expect(notifications.notifyAnalyticsReport).toHaveBeenCalled();
    });

    it("should handle email send failure", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "camp-1",
                name: "Campaign 1",
                recipientCount: 1000,
                sentCount: 950,
                openCount: 475,
                clickCount: 95,
              },
            ]),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: false,
        error: "Failed to send",
        timestamp: new Date(),
      });

      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-01-08");

      const result = await generateAndSendAnalyticsReport(1, "admin@example.com", startDate, endDate);

      expect(result).toBe(false);
    });
  });

  describe("scheduleWeeklyAnalyticsReport", () => {
    it("should schedule weekly analytics report", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "camp-1",
                name: "Campaign 1",
                recipientCount: 1000,
                sentCount: 950,
                openCount: 475,
                clickCount: 95,
              },
            ]),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });
      vi.mocked(notifications.notifyAnalyticsReport).mockResolvedValue({
        slack: true,
        email: true,
      });

      const result = await scheduleWeeklyAnalyticsReport(1, "admin@example.com");

      expect(result).toBe(true);
    });
  });

  describe("scheduleMonthlyAnalyticsReport", () => {
    it("should schedule monthly analytics report", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "camp-1",
                name: "Campaign 1",
                recipientCount: 1000,
                sentCount: 950,
                openCount: 475,
                clickCount: 95,
              },
            ]),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });
      vi.mocked(notifications.notifyAnalyticsReport).mockResolvedValue({
        slack: true,
        email: true,
      });

      const result = await scheduleMonthlyAnalyticsReport(1, "admin@example.com");

      expect(result).toBe(true);
    });
  });
});
