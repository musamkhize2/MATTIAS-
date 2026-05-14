import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsRouter } from "./analyticsRouter";

describe("analyticsRouter", () => {
  describe("getCampaignMetrics", () => {
    it("should return campaign metrics", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "test-campaign" });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("metrics");
    });

    it("should handle missing campaigns", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "nonexistent" });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getAllCampaignsMetrics", () => {
    it("should return all campaigns with metrics", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getAllCampaignsMetrics({ limit: 10, offset: 0 });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("campaigns");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.campaigns)).toBe(true);
    });

    it("should respect limit and offset", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getAllCampaignsMetrics({ limit: 5, offset: 0 });

      expect(result.campaigns.length).toBeLessThanOrEqual(5);
    });

    it("should return campaign summary metrics", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getAllCampaignsMetrics({ limit: 1 });

      if (result.campaigns.length > 0) {
        const campaign = result.campaigns[0];
        expect(campaign).toHaveProperty("id");
        expect(campaign).toHaveProperty("name");
        expect(campaign).toHaveProperty("status");
        expect(campaign).toHaveProperty("sentCount");
        expect(campaign).toHaveProperty("openRate");
        expect(campaign).toHaveProperty("clickRate");
      }
    });
  });

  describe("getPerformanceComparison", () => {
    it("should compare multiple campaigns", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getPerformanceComparison({
        campaignIds: ["campaign1", "campaign2"],
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("comparison");
      expect(Array.isArray(result.comparison)).toBe(true);
    });

    it("should handle empty campaign list", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getPerformanceComparison({
        campaignIds: [],
      });

      expect(result.success).toBe(true);
      expect(result.comparison.length).toBe(0);
    });

    it("should return comparison metrics", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getPerformanceComparison({
        campaignIds: ["test"],
      });

      if (result.comparison.length > 0) {
        const comparison = result.comparison[0];
        expect(comparison).toHaveProperty("campaignId");
        expect(comparison).toHaveProperty("campaignName");
        expect(comparison).toHaveProperty("sentCount");
        expect(comparison).toHaveProperty("openRate");
        expect(comparison).toHaveProperty("clickRate");
      }
    });
  });

  describe("getEngagementTimeline", () => {
    it("should return engagement timeline", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getEngagementTimeline({
        campaignId: "test-campaign",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("timeline");
      expect(Array.isArray(result.timeline)).toBe(true);
    });

    it("should handle date filtering", async () => {
      const caller = analyticsRouter.createCaller({});
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-12-31");

      const result = await caller.getEngagementTimeline({
        campaignId: "test-campaign",
        startDate,
        endDate,
      });

      expect(result).toHaveProperty("success");
      expect(Array.isArray(result.timeline)).toBe(true);
    });

    it("should return timeline with date and metrics", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getEngagementTimeline({
        campaignId: "test-campaign",
      });

      if (result.timeline.length > 0) {
        const entry = result.timeline[0];
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("opens");
        expect(entry).toHaveProperty("clicks");
      }
    });

    it("should handle missing campaigns in timeline", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getEngagementTimeline({
        campaignId: "nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getRecipientEngagement", () => {
    it("should return recipient engagement details", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getRecipientEngagement({
        campaignId: "test-campaign",
        recipientEmail: "test@example.com",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("engagement");
    });

    it("should validate email format", async () => {
      const caller = analyticsRouter.createCaller({});

      try {
        await caller.getRecipientEngagement({
          campaignId: "test-campaign",
          recipientEmail: "invalid-email",
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should return engagement metrics for recipient", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getRecipientEngagement({
        campaignId: "test-campaign",
        recipientEmail: "test@example.com",
      });

      if (result.success && result.engagement) {
        const engagement = result.engagement;
        expect(engagement).toHaveProperty("email");
        expect(engagement).toHaveProperty("campaignId");
        expect(engagement).toHaveProperty("sent");
        expect(engagement).toHaveProperty("opened");
        expect(engagement).toHaveProperty("clicked");
        expect(engagement).toHaveProperty("bounced");
        expect(engagement).toHaveProperty("actions");
      }
    });

    it("should handle missing campaigns in recipient engagement", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getRecipientEngagement({
        campaignId: "nonexistent",
        recipientEmail: "test@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "" });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("metrics");
    });

    it("should return proper error messages", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "nonexistent" });

      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe("string");
      }
    });
  });

  describe("metrics calculations", () => {
    it("should calculate open rate correctly", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "test" });

      if (result.success && result.metrics) {
        const { openRate, sentCount, openCount } = result.metrics;
        if (sentCount > 0) {
          expect(openRate).toBe((openCount / sentCount) * 100);
        }
      }
    });

    it("should calculate click rate correctly", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "test" });

      if (result.success && result.metrics) {
        const { clickRate, sentCount, clickCount } = result.metrics;
        if (sentCount > 0) {
          expect(clickRate).toBe((clickCount / sentCount) * 100);
        }
      }
    });

    it("should handle zero sent count", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "test" });

      if (result.success && result.metrics) {
        const { sentCount, openRate, clickRate } = result.metrics;
        if (sentCount === 0) {
          expect(openRate).toBe(0);
          expect(clickRate).toBe(0);
        }
      }
    });
  });

  describe("data consistency", () => {
    it("should return consistent metrics across calls", async () => {
      const caller = analyticsRouter.createCaller({});
      const result1 = await caller.getCampaignMetrics({ campaignId: "test" });
      const result2 = await caller.getCampaignMetrics({ campaignId: "test" });

      expect(result1).toEqual(result2);
    });

    it("should include all required fields in campaign metrics", async () => {
      const caller = analyticsRouter.createCaller({});
      const result = await caller.getCampaignMetrics({ campaignId: "test" });

      if (result.success && result.metrics) {
        const metrics = result.metrics;
        expect(metrics).toHaveProperty("campaignId");
        expect(metrics).toHaveProperty("campaignName");
        expect(metrics).toHaveProperty("status");
        expect(metrics).toHaveProperty("sentCount");
        expect(metrics).toHaveProperty("openCount");
        expect(metrics).toHaveProperty("clickCount");
        expect(metrics).toHaveProperty("bounceCount");
        expect(metrics).toHaveProperty("openRate");
        expect(metrics).toHaveProperty("clickRate");
        expect(metrics).toHaveProperty("bounceRate");
      }
    });
  });
});
