import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";

/**
 * Marketing Automation Service
 * Handles campaign optimization, budget management, and performance tracking
 */

export interface Campaign {
  id: string;
  tenantId: number;
  name: string;
  platform: "google_ads" | "meta_ads" | "tiktok_ads" | "youtube";
  status: "active" | "paused" | "completed" | "scheduled";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  startDate: Date;
  endDate: Date;
}

export interface CampaignMetrics {
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  cpa: number; // Cost per acquisition
  roas: number; // Return on ad spend
  conversionRate: number;
}

export interface BudgetAllocation {
  campaignId: string;
  platform: string;
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  remaining: number;
}

/**
 * Calculate campaign metrics
 */
export function calculateMetrics(campaign: Campaign): CampaignMetrics {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const cpc = campaign.clicks > 0 ? campaign.spent / campaign.clicks : 0;
  const cpa = campaign.conversions > 0 ? campaign.spent / campaign.conversions : 0;
  const roas = campaign.spent > 0 ? (campaign.conversions * 100) / campaign.spent : 0; // Assuming $100 avg order value
  const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

  return {
    ctr: parseFloat(ctr.toFixed(2)),
    cpc: parseFloat(cpc.toFixed(2)),
    cpa: parseFloat(cpa.toFixed(2)),
    roas: parseFloat(roas.toFixed(2)),
    conversionRate: parseFloat(conversionRate.toFixed(2)),
  };
}

/**
 * Optimize campaign budget allocation
 */
export function optimizeBudgetAllocation(
  campaigns: Campaign[],
  totalBudget: number
): BudgetAllocation[] {
  // Group campaigns by performance (ROAS)
  const campaignsWithMetrics = campaigns.map((c) => ({
    ...c,
    metrics: calculateMetrics(c),
  }));

  // Sort by ROAS (best performing first)
  const sorted = campaignsWithMetrics.sort((a, b) => b.metrics.roas - a.metrics.roas);

  // Allocate budget proportionally to performance
  const allocations: BudgetAllocation[] = sorted.map((campaign) => {
    const budgetShare = (campaign.metrics.roas / 100) * totalBudget;
    const dailyBudget = budgetShare / 30; // Assume 30-day month

    return {
      campaignId: campaign.id,
      platform: campaign.platform,
      dailyBudget: parseFloat(dailyBudget.toFixed(2)),
      totalBudget: parseFloat(budgetShare.toFixed(2)),
      spent: campaign.spent,
      remaining: parseFloat((budgetShare - campaign.spent).toFixed(2)),
    };
  });

  return allocations;
}

/**
 * Identify optimization opportunities
 */
export function identifyOptimizations(campaign: Campaign): string[] {
  const metrics = calculateMetrics(campaign);
  const opportunities: string[] = [];

  // Low CTR
  if (metrics.ctr < 1.0) {
    opportunities.push("Low click-through rate. Consider improving ad creative or targeting.");
  }

  // High CPC
  if (metrics.cpc > 2.0) {
    opportunities.push("High cost per click. Review keyword bids and competition.");
  }

  // Low conversion rate
  if (metrics.conversionRate < 2.0) {
    opportunities.push("Low conversion rate. Optimize landing page or offer.");
  }

  // Poor ROAS
  if (metrics.roas < 2.0) {
    opportunities.push("Poor return on ad spend. Consider pausing underperforming ad sets.");
  }

  // Budget not spent
  const budgetUtilization = (campaign.spent / campaign.budget) * 100;
  if (budgetUtilization < 50) {
    opportunities.push("Low budget utilization. Increase bids or expand targeting.");
  }

  if (opportunities.length === 0) {
    opportunities.push("Campaign is performing well. No immediate optimizations needed.");
  }

  return opportunities;
}

/**
 * Predict campaign performance
 */
export function predictPerformance(
  campaign: Campaign,
  daysElapsed: number
): {
  projectedConversions: number;
  projectedSpend: number;
  projectedROAS: number;
} {
  if (daysElapsed === 0) {
    return {
      projectedConversions: 0,
      projectedSpend: 0,
      projectedROAS: 0,
    };
  }

  const totalDays = Math.ceil(
    (campaign.endDate.getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const dailyConversionRate = campaign.conversions / daysElapsed;
  const dailySpendRate = campaign.spent / daysElapsed;

  const projectedConversions = Math.round(dailyConversionRate * totalDays);
  const projectedSpend = dailySpendRate * totalDays;
  const projectedROAS = projectedSpend > 0 ? (projectedConversions * 100) / projectedSpend : 0;

  return {
    projectedConversions,
    projectedSpend: parseFloat(projectedSpend.toFixed(2)),
    projectedROAS: parseFloat(projectedROAS.toFixed(2)),
  };
}

/**
 * Compare campaign performance
 */
export function compareCampaigns(campaigns: Campaign[]): {
  bestPerformer: Campaign;
  worstPerformer: Campaign;
  averageMetrics: CampaignMetrics;
} {
  if (campaigns.length === 0) {
    throw new Error("No campaigns to compare");
  }

  const metricsArray = campaigns.map((c) => calculateMetrics(c));

  // Find best and worst by ROAS
  let bestIdx = 0;
  let worstIdx = 0;

  for (let i = 1; i < metricsArray.length; i++) {
    if (metricsArray[i].roas > metricsArray[bestIdx].roas) {
      bestIdx = i;
    }
    if (metricsArray[i].roas < metricsArray[worstIdx].roas) {
      worstIdx = i;
    }
  }

  // Calculate averages
  const avgCTR = metricsArray.reduce((sum, m) => sum + m.ctr, 0) / metricsArray.length;
  const avgCPC = metricsArray.reduce((sum, m) => sum + m.cpc, 0) / metricsArray.length;
  const avgCPA = metricsArray.reduce((sum, m) => sum + m.cpa, 0) / metricsArray.length;
  const avgROAS = metricsArray.reduce((sum, m) => sum + m.roas, 0) / metricsArray.length;
  const avgConversionRate =
    metricsArray.reduce((sum, m) => sum + m.conversionRate, 0) / metricsArray.length;

  return {
    bestPerformer: campaigns[bestIdx],
    worstPerformer: campaigns[worstIdx],
    averageMetrics: {
      ctr: parseFloat(avgCTR.toFixed(2)),
      cpc: parseFloat(avgCPC.toFixed(2)),
      cpa: parseFloat(avgCPA.toFixed(2)),
      roas: parseFloat(avgROAS.toFixed(2)),
      conversionRate: parseFloat(avgConversionRate.toFixed(2)),
    },
  };
}

/**
 * Recommend bid adjustments
 */
export function recommendBidAdjustments(
  campaign: Campaign,
  targetROAS: number = 3.0
): {
  recommendation: "increase" | "decrease" | "maintain";
  adjustmentPercentage: number;
  reason: string;
} {
  const metrics = calculateMetrics(campaign);

  if (metrics.roas > targetROAS * 1.2) {
    // Performing well above target
    return {
      recommendation: "increase",
      adjustmentPercentage: 10,
      reason: `ROAS is ${metrics.roas.toFixed(1)}x, well above target of ${targetROAS}x. Increase bids to capture more volume.`,
    };
  } else if (metrics.roas > targetROAS * 0.8) {
    // Performing near target
    return {
      recommendation: "maintain",
      adjustmentPercentage: 0,
      reason: `ROAS is ${metrics.roas.toFixed(1)}x, close to target of ${targetROAS}x. Maintain current bids.`,
    };
  } else {
    // Performing below target
    return {
      recommendation: "decrease",
      adjustmentPercentage: -15,
      reason: `ROAS is ${metrics.roas.toFixed(1)}x, below target of ${targetROAS}x. Decrease bids to improve efficiency.`,
    };
  }
}

/**
 * Calculate budget pacing
 */
export function calculateBudgetPacing(campaign: Campaign): {
  dailyPaceNeeded: number;
  currentDailyPace: number;
  onTrack: boolean;
  daysRemaining: number;
} {
  const now = new Date();
  const daysElapsed = Math.ceil(
    (now.getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.ceil(
    (campaign.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const totalDays = daysElapsed + daysRemaining;
  const dailyPaceNeeded = campaign.budget / totalDays;
  const currentDailyPace = daysElapsed > 0 ? campaign.spent / daysElapsed : 0;

  const onTrack = Math.abs(currentDailyPace - dailyPaceNeeded) / dailyPaceNeeded < 0.1; // Within 10%

  return {
    dailyPaceNeeded: parseFloat(dailyPaceNeeded.toFixed(2)),
    currentDailyPace: parseFloat(currentDailyPace.toFixed(2)),
    onTrack,
    daysRemaining: Math.max(daysRemaining, 0),
  };
}
