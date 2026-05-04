import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { cognitiveBudgets } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Cognitive Trigger Threshold System
 * Intelligent routing between fast path and deep CFE based on complexity
 */

export interface ThresholdConfig {
  ambiguityThreshold: number; // 0-1, default 0.5
  impactThreshold: number; // 0-1, default 0.6
  complexityWeights: {
    low: number;
    medium: number;
    high: number;
  };
  uncertaintyMultiplier: number; // 1-2, amplifies CFE activation
}

export interface TriggerEvaluation {
  shouldTriggerCFE: boolean;
  score: number;
  factors: {
    complexity: number;
    ambiguity: number;
    impact: number;
    uncertainty: number;
  };
  reasoning: string;
}

/**
 * Default threshold configuration
 */
export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  ambiguityThreshold: 0.5,
  impactThreshold: 0.6,
  complexityWeights: {
    low: 0.3,
    medium: 0.6,
    high: 1.0,
  },
  uncertaintyMultiplier: 1.5,
};

/**
 * Evaluate if CFE should be triggered
 */
export function evaluateTrigger(
  complexity: "low" | "medium" | "high",
  ambiguity: number,
  impact: number,
  uncertainty: number = 0,
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): TriggerEvaluation {
  // Normalize inputs
  ambiguity = Math.max(0, Math.min(1, ambiguity));
  impact = Math.max(0, Math.min(1, impact));
  uncertainty = Math.max(0, Math.min(1, uncertainty));

  // Get complexity weight
  const complexityWeight = config.complexityWeights[complexity];

  // Calculate weighted score
  const baseScore =
    complexityWeight * 0.4 + ambiguity * 0.3 + impact * 0.3;

  // Apply uncertainty multiplier
  const uncertaintyBoost = uncertainty * (config.uncertaintyMultiplier - 1);
  const finalScore = Math.min(1, baseScore + uncertaintyBoost);

  // Determine if CFE should trigger
  const shouldTrigger =
    complexity === "high" ||
    ambiguity > config.ambiguityThreshold ||
    impact > config.impactThreshold ||
    finalScore > 0.65;

  // Generate reasoning
  const factors = [];
  if (complexity === "high") factors.push("high complexity");
  if (ambiguity > config.ambiguityThreshold) factors.push(`high ambiguity (${ambiguity.toFixed(2)})`);
  if (impact > config.impactThreshold) factors.push(`high impact (${impact.toFixed(2)})`);
  if (uncertainty > 0.3) factors.push(`uncertainty detected (${uncertainty.toFixed(2)})`);

  const reasoning =
    factors.length > 0
      ? `CFE triggered due to: ${factors.join(", ")}`
      : "Using fast path - low complexity, ambiguity, and impact";

  return {
    shouldTriggerCFE: shouldTrigger,
    score: finalScore,
    factors: {
      complexity: complexityWeight,
      ambiguity,
      impact,
      uncertainty,
    },
    reasoning,
  };
}

/**
 * Get tenant-specific threshold configuration
 */
export async function getTenantThresholdConfig(
  tenantId: number
): Promise<ThresholdConfig> {
  const db = await getDb();
  if (!db) return DEFAULT_THRESHOLD_CONFIG;

  try {
    const budget = await db
      .select()
      .from(cognitiveBudgets)
      .where(eq(cognitiveBudgets.tenantId, tenantId))
      .limit(1);

    if (budget.length === 0) return DEFAULT_THRESHOLD_CONFIG;

    // Return default config based on subscription tier
    const tier = budget[0].subscriptionTier;
    if (tier === "enterprise") {
      return {
        ...DEFAULT_THRESHOLD_CONFIG,
        ambiguityThreshold: 0.4,
        impactThreshold: 0.5,
        uncertaintyMultiplier: 2.0,
      };
    } else if (tier === "professional") {
      return {
        ...DEFAULT_THRESHOLD_CONFIG,
        ambiguityThreshold: 0.45,
        impactThreshold: 0.55,
        uncertaintyMultiplier: 1.7,
      };
    }

    return DEFAULT_THRESHOLD_CONFIG;
  } catch (error) {
    console.error("Error fetching threshold config:", error);
    return DEFAULT_THRESHOLD_CONFIG;
  }
}

/**
 * Update tenant threshold configuration
 */
export async function updateTenantThresholdConfig(
  tenantId: number,
  config: Partial<ThresholdConfig>
): Promise<ThresholdConfig> {
  const db = await getDb();
  if (!db) return DEFAULT_THRESHOLD_CONFIG;

  try {
    const currentConfig = await getTenantThresholdConfig(tenantId);
    const mergedConfig = { ...currentConfig, ...config };
    // Note: Config is stored implicitly via subscription tier
    // In a production system, you would have a separate config table
    console.log("Threshold config update requested:", mergedConfig);

    return mergedConfig;
  } catch (error) {
    console.error("Error updating threshold config:", error);
    return DEFAULT_THRESHOLD_CONFIG;
  }
}

/**
 * Adaptive threshold adjustment based on performance
 */
export function adaptiveAdjustment(
  currentConfig: ThresholdConfig,
  performanceData: {
    fastPathAccuracy: number;
    deepPathAccuracy: number;
    fastPathLatency: number;
    deepPathLatency: number;
    costPerFastPath: number;
    costPerDeepPath: number;
  }
): ThresholdConfig {
  const adjusted = { ...currentConfig };

  // If fast path is performing well and is cost-effective
  if (
    performanceData.fastPathAccuracy > 0.85 &&
    performanceData.fastPathLatency < 1000 &&
    performanceData.costPerFastPath < performanceData.costPerDeepPath * 0.3
  ) {
    // Increase thresholds to use fast path more
    adjusted.ambiguityThreshold = Math.min(0.7, currentConfig.ambiguityThreshold + 0.05);
    adjusted.impactThreshold = Math.min(0.8, currentConfig.impactThreshold + 0.05);
  }

  // If deep path is significantly more accurate
  if (performanceData.deepPathAccuracy - performanceData.fastPathAccuracy > 0.25) {
    // Decrease thresholds to use deep path more
    adjusted.ambiguityThreshold = Math.max(0.3, currentConfig.ambiguityThreshold - 0.05);
    adjusted.impactThreshold = Math.max(0.4, currentConfig.impactThreshold - 0.05);
  }

  // Adjust uncertainty multiplier based on cost
  if (performanceData.costPerDeepPath > performanceData.costPerFastPath * 10) {
    adjusted.uncertaintyMultiplier = Math.max(1, currentConfig.uncertaintyMultiplier - 0.1);
  }

  return adjusted;
}

/**
 * Get threshold statistics
 */
export async function getThresholdStats(
  tenantId: number
): Promise<{
  config: ThresholdConfig;
  triggerRate: number;
  avgScore: number;
  lastUpdated: Date;
}> {
  const db = await getDb();
  const config = await getTenantThresholdConfig(tenantId);

  if (!db) {
    return {
      config,
      triggerRate: 0.5,
      avgScore: 0.5,
      lastUpdated: new Date(),
    };
  }

  try {
    const budget = await db
      .select()
      .from(cognitiveBudgets)
      .where(eq(cognitiveBudgets.tenantId, tenantId))
      .limit(1);

    if (budget.length === 0) {
      return {
        config,
        triggerRate: 0.5,
        avgScore: 0.5,
        lastUpdated: new Date(),
      };
    }

    return {
      config,
      triggerRate: 0.5,
      avgScore: 0.5,
      lastUpdated: budget[0].updatedAt ?? new Date(),
    };
  } catch (error) {
    console.error("Error fetching threshold stats:", error);
    return {
      config,
      triggerRate: 0.5,
      avgScore: 0.5,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Validate threshold configuration
 */
export function validateThresholdConfig(config: ThresholdConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.ambiguityThreshold < 0 || config.ambiguityThreshold > 1) {
    errors.push("ambiguityThreshold must be between 0 and 1");
  }

  if (config.impactThreshold < 0 || config.impactThreshold > 1) {
    errors.push("impactThreshold must be between 0 and 1");
  }

  if (config.uncertaintyMultiplier < 1 || config.uncertaintyMultiplier > 2) {
    errors.push("uncertaintyMultiplier must be between 1 and 2");
  }

  const weights = config.complexityWeights;
  if (weights.low < 0 || weights.low > 1) {
    errors.push("complexityWeights.low must be between 0 and 1");
  }

  if (weights.medium < 0 || weights.medium > 1) {
    errors.push("complexityWeights.medium must be between 0 and 1");
  }

  if (weights.high < 0 || weights.high > 1) {
    errors.push("complexityWeights.high must be between 0 and 1");
  }

  if (weights.low >= weights.medium || weights.medium >= weights.high) {
    errors.push("complexityWeights must be in ascending order: low < medium < high");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Reset threshold to defaults
 */
export async function resetThresholdToDefaults(tenantId: number): Promise<ThresholdConfig> {
  const db = await getDb();
  if (!db) return DEFAULT_THRESHOLD_CONFIG;

  try {
    // Reset is implicit - just return defaults
    console.log("Threshold reset to defaults for tenant:", tenantId);

    return DEFAULT_THRESHOLD_CONFIG;
  } catch (error) {
    console.error("Error resetting threshold:", error);
    return DEFAULT_THRESHOLD_CONFIG;
  }
}
