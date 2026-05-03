import { describe, it, expect } from "vitest";
import {
  calculateMetrics,
  optimizeBudgetAllocation,
  identifyOptimizations,
  predictPerformance,
  compareCampaigns,
  recommendBidAdjustments,
  calculateBudgetPacing,
  Campaign,
} from "./marketingAutomation";

describe("Marketing Automation Service", () => {
  const mockCampaign: Campaign = {
    id: "camp-1",
    tenantId: 1,
    name: "Test Campaign",
    platform: "google_ads",
    status: "active",
    budget: 5000,
    spent: 2500,
    impressions: 100000,
    clicks: 3000,
    conversions: 150,
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
  };

  describe("calculateMetrics", () => {
    it("should calculate CTR correctly", () => {
      const metrics = calculateMetrics(mockCampaign);
      const expectedCTR = (mockCampaign.clicks / mockCampaign.impressions) * 100;
      expect(metrics.ctr).toBe(parseFloat(expectedCTR.toFixed(2)));
    });

    it("should calculate CPC correctly", () => {
      const metrics = calculateMetrics(mockCampaign);
      const expectedCPC = mockCampaign.spent / mockCampaign.clicks;
      expect(metrics.cpc).toBe(parseFloat(expectedCPC.toFixed(2)));
    });

    it("should calculate conversion rate correctly", () => {
      const metrics = calculateMetrics(mockCampaign);
      const expectedConvRate = (mockCampaign.conversions / mockCampaign.clicks) * 100;
      expect(metrics.conversionRate).toBe(parseFloat(expectedConvRate.toFixed(2)));
    });

    it("should handle zero impressions", () => {
      const campaign = { ...mockCampaign, impressions: 0 };
      const metrics = calculateMetrics(campaign);
      expect(metrics.ctr).toBe(0);
    });

    it("should handle zero clicks", () => {
      const campaign = { ...mockCampaign, clicks: 0 };
      const metrics = calculateMetrics(campaign);
      expect(metrics.cpc).toBe(0);
      expect(metrics.conversionRate).toBe(0);
    });
  });

  describe("optimizeBudgetAllocation", () => {
    it("should allocate budget to campaigns", () => {
      const campaigns = [mockCampaign, { ...mockCampaign, id: "camp-2", roas: 5 }];
      const allocations = optimizeBudgetAllocation(campaigns, 10000);

      expect(allocations).toHaveLength(2);
      expect(allocations.every((a) => a.totalBudget > 0)).toBe(true);
    });

    it("should allocate more budget to better performers", () => {
      const campaign1 = { ...mockCampaign, id: "camp-1", spent: 1000, conversions: 50 };
      const campaign2 = { ...mockCampaign, id: "camp-2", spent: 1000, conversions: 100 };

      const allocations = optimizeBudgetAllocation([campaign1, campaign2], 10000);
      expect(allocations[0].totalBudget).toBeGreaterThan(allocations[1].totalBudget);
    });

    it("should calculate daily budget", () => {
      const allocations = optimizeBudgetAllocation([mockCampaign], 3000);
      expect(allocations[0].dailyBudget).toBeCloseTo(allocations[0].totalBudget / 30, 1);
    });
  });

  describe("identifyOptimizations", () => {
    it("should identify low CTR", () => {
      const campaign = { ...mockCampaign, clicks: 100, impressions: 100000 };
      const optimizations = identifyOptimizations(campaign);
      expect(optimizations.some((o) => o.includes("click-through rate"))).toBe(true);
    });

    it("should identify high CPC", () => {
      const campaign = { ...mockCampaign, spent: 10000, clicks: 1000 };
      const optimizations = identifyOptimizations(campaign);
      expect(optimizations.some((o) => o.includes("cost per click"))).toBe(true);
    });

    it("should identify low conversion rate", () => {
      const campaign = { ...mockCampaign, conversions: 10, clicks: 1000 };
      const optimizations = identifyOptimizations(campaign);
      expect(optimizations.some((o) => o.includes("conversion rate"))).toBe(true);
    });

    it("should identify low budget utilization", () => {
      const campaign = { ...mockCampaign, spent: 500, budget: 5000 };
      const optimizations = identifyOptimizations(campaign);
      expect(optimizations.some((o) => o.includes("budget utilization"))).toBe(true);
    });
  });

  describe("predictPerformance", () => {
    it("should project conversions", () => {
      const prediction = predictPerformance(mockCampaign, 7);
      expect(prediction.projectedConversions).toBeGreaterThan(0);
    });

    it("should project spend", () => {
      const prediction = predictPerformance(mockCampaign, 7);
      expect(prediction.projectedSpend).toBeGreaterThan(0);
    });

    it("should handle zero days elapsed", () => {
      const prediction = predictPerformance(mockCampaign, 0);
      expect(prediction.projectedConversions).toBe(0);
      expect(prediction.projectedSpend).toBe(0);
    });
  });

  describe("compareCampaigns", () => {
    it("should identify best performer", () => {
      const campaigns = [
        { ...mockCampaign, id: "camp-1", conversions: 50 },
        { ...mockCampaign, id: "camp-2", conversions: 200 },
      ];
      const comparison = compareCampaigns(campaigns);
      expect(comparison.bestPerformer.id).toBe("camp-2");
    });

    it("should identify worst performer", () => {
      const campaigns = [
        { ...mockCampaign, id: "camp-1", conversions: 50 },
        { ...mockCampaign, id: "camp-2", conversions: 200 },
      ];
      const comparison = compareCampaigns(campaigns);
      expect(comparison.worstPerformer.id).toBe("camp-1");
    });

    it("should calculate average metrics", () => {
      const campaigns = [
        { ...mockCampaign, id: "camp-1" },
        { ...mockCampaign, id: "camp-2" },
      ];
      const comparison = compareCampaigns(campaigns);
      expect(comparison.averageMetrics.ctr).toBeGreaterThan(0);
      expect(comparison.averageMetrics.cpc).toBeGreaterThan(0);
    });

    it("should throw error with empty array", () => {
      expect(() => compareCampaigns([])).toThrow();
    });
  });

  describe("recommendBidAdjustments", () => {
    it("should recommend increase for high ROAS", () => {
      const campaign = { ...mockCampaign, spent: 1000, conversions: 100 };
      const recommendation = recommendBidAdjustments(campaign, 3.0);
      expect(recommendation.recommendation).toBe("increase");
      expect(recommendation.adjustmentPercentage).toBeGreaterThan(0);
    });

    it("should recommend decrease for low ROAS", () => {
      const campaign = { ...mockCampaign, spent: 5000, conversions: 10 };
      const recommendation = recommendBidAdjustments(campaign, 3.0);
      expect(recommendation.recommendation).toBe("decrease");
      expect(recommendation.adjustmentPercentage).toBeLessThan(0);
    });

    it("should recommend maintain for near-target ROAS", () => {
      const campaign = { ...mockCampaign, spent: 2500, conversions: 75 };
      const recommendation = recommendBidAdjustments(campaign, 3.0);
      expect(recommendation.recommendation).toBe("maintain");
      expect(recommendation.adjustmentPercentage).toBe(0);
    });
  });

  describe("calculateBudgetPacing", () => {
    it("should calculate daily pace needed", () => {
      const pacing = calculateBudgetPacing(mockCampaign);
      expect(pacing.dailyPaceNeeded).toBeGreaterThan(0);
    });

    it("should calculate current daily pace", () => {
      const pacing = calculateBudgetPacing(mockCampaign);
      expect(pacing.currentDailyPace).toBeGreaterThan(0);
    });

    it("should determine if on track", () => {
      const pacing = calculateBudgetPacing(mockCampaign);
      expect(typeof pacing.onTrack).toBe("boolean");
    });

    it("should calculate days remaining", () => {
      const pacing = calculateBudgetPacing(mockCampaign);
      expect(pacing.daysRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle campaign with zero budget", () => {
      const campaign = { ...mockCampaign, budget: 0, spent: 0 };
      const metrics = calculateMetrics(campaign);
      expect(metrics.roas).toBe(0);
    });

    it("should handle campaign with no conversions", () => {
      const campaign = { ...mockCampaign, conversions: 0 };
      const metrics = calculateMetrics(campaign);
      expect(metrics.cpa).toBe(0);
      expect(metrics.conversionRate).toBe(0);
    });

    it("should handle very small numbers", () => {
      const campaign = { ...mockCampaign, impressions: 1, clicks: 1, conversions: 1 };
      const metrics = calculateMetrics(campaign);
      expect(metrics.ctr).toBe(100);
      expect(metrics.conversionRate).toBe(100);
    });
  });
});
