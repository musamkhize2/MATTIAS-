import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendSlackNotification,
  sendEmailNotification,
  sendTenantNotification,
  notifyCampaignDeliveryFailure,
  notifyApprovalPending,
  notifyAnalyticsReport,
} from "./notificationService";
import * as domainConfig from "./domainConfig";
import * as mailerlite from "./mailerliteTransactional";

// Mock dependencies
vi.mock("./domainConfig");
vi.mock("./mailerliteTransactional");

describe("notificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendSlackNotification", () => {
    it("should send Slack notification successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: "OK",
      });

      const result = await sendSlackNotification("https://hooks.slack.com/test", {
        title: "Test Alert",
        message: "This is a test",
        type: "system_alert",
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it("should handle Slack notification failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
      });

      const result = await sendSlackNotification("https://hooks.slack.com/test", {
        title: "Test Alert",
        message: "This is a test",
        type: "system_alert",
      });

      expect(result).toBe(false);
    });

    it("should handle network errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await sendSlackNotification("https://hooks.slack.com/test", {
        title: "Test Alert",
        message: "This is a test",
        type: "system_alert",
      });

      expect(result).toBe(false);
    });
  });

  describe("sendEmailNotification", () => {
    it("should send email notification successfully", async () => {
      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });

      const result = await sendEmailNotification("test@example.com", {
        title: "Test Alert",
        message: "This is a test",
        type: "system_alert",
      });

      expect(result).toBe(true);
      expect(mailerlite.sendTransactionalEmail).toHaveBeenCalled();
    });

    it("should handle email notification failure", async () => {
      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: false,
        error: "Failed to send",
        timestamp: new Date(),
      });

      const result = await sendEmailNotification("test@example.com", {
        title: "Test Alert",
        message: "This is a test",
        type: "system_alert",
      });

      expect(result).toBe(false);
    });
  });

  describe("sendTenantNotification", () => {
    it("should send both Slack and email notifications", async () => {
      vi.mocked(domainConfig.getDomainConfig).mockResolvedValue({
        tenantId: 1,
        webhookBaseUrl: "https://example.com",
        slackWebhookUrl: "https://hooks.slack.com/test",
        notificationEmail: "admin@example.com",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: "OK",
      });

      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });

      const result = await sendTenantNotification(1, {
        title: "Test Alert",
        message: "This is a test",
        type: "system_alert",
      });

      expect(result.slack).toBe(true);
      expect(result.email).toBe(true);
    });

    it("should handle missing Slack webhook", async () => {
      vi.mocked(domainConfig.getDomainConfig).mockResolvedValue({
        tenantId: 1,
        webhookBaseUrl: "https://example.com",
        notificationEmail: "admin@example.com",
      });

      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });

      const result = await sendTenantNotification(1, {
        title: "Test Alert",
        message: "This is a test",
        type: "system_alert",
      });

      expect(result.slack).toBe(false);
      expect(result.email).toBe(true);
    });
  });

  describe("notifyCampaignDeliveryFailure", () => {
    it("should send campaign delivery failure notification", async () => {
      vi.mocked(domainConfig.getDomainConfig).mockResolvedValue({
        tenantId: 1,
        webhookBaseUrl: "https://example.com",
        slackWebhookUrl: "https://hooks.slack.com/test",
        notificationEmail: "admin@example.com",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: "OK",
      });

      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });

      const result = await notifyCampaignDeliveryFailure(1, "camp-123", "Test Campaign", 10, 100);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(true);
    });
  });

  describe("notifyApprovalPending", () => {
    it("should send approval pending notification", async () => {
      vi.mocked(domainConfig.getDomainConfig).mockResolvedValue({
        tenantId: 1,
        webhookBaseUrl: "https://example.com",
        slackWebhookUrl: "https://hooks.slack.com/test",
        notificationEmail: "admin@example.com",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: "OK",
      });

      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });

      const result = await notifyApprovalPending(1, "appr-123", "Send Campaign", 7500);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(true);
    });
  });

  describe("notifyAnalyticsReport", () => {
    it("should send analytics report notification", async () => {
      vi.mocked(domainConfig.getDomainConfig).mockResolvedValue({
        tenantId: 1,
        webhookBaseUrl: "https://example.com",
        slackWebhookUrl: "https://hooks.slack.com/test",
        notificationEmail: "admin@example.com",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: "OK",
      });

      vi.mocked(mailerlite.sendTransactionalEmail).mockResolvedValue({
        success: true,
        messageId: "msg-123",
        timestamp: new Date(),
      });

      const result = await notifyAnalyticsReport(1, "Jan 1-7", 5, 1000, 25.5, 12.3);

      expect(result.slack).toBe(true);
      expect(result.email).toBe(true);
    });
  });
});
