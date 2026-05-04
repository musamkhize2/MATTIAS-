import { describe, it, expect } from "vitest";
import {
  evaluateTrigger,
  DEFAULT_THRESHOLD_CONFIG,
  adaptiveAdjustment,
  validateThresholdConfig,
} from "./cognitiveThreshold";

describe("Cognitive Threshold System", () => {
  describe("Trigger Evaluation", () => {
    it("should trigger CFE for high complexity", () => {
      const result = evaluateTrigger("high", 0.2, 0.2);
      expect(result.shouldTriggerCFE).toBe(true);
    });

    it("should trigger CFE for high ambiguity", () => {
      const result = evaluateTrigger("low", 0.7, 0.2);
      expect(result.shouldTriggerCFE).toBe(true);
    });

    it("should trigger CFE for high impact", () => {
      const result = evaluateTrigger("low", 0.2, 0.8);
      expect(result.shouldTriggerCFE).toBe(true);
    });

    it("should not trigger CFE for low complexity and low metrics", () => {
      const result = evaluateTrigger("low", 0.1, 0.1);
      expect(result.shouldTriggerCFE).toBe(false);
    });

    it("should provide score between 0 and 1", () => {
      const result = evaluateTrigger("medium", 0.5, 0.5);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("should include reasoning for decision", () => {
      const result = evaluateTrigger("high", 0.5, 0.5);
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should normalize input values", () => {
      const result = evaluateTrigger("low", 1.5, -0.5); // Out of range
      expect(result.factors.ambiguity).toBeLessThanOrEqual(1);
      expect(result.factors.ambiguity).toBeGreaterThanOrEqual(0);
      expect(result.factors.impact).toBeLessThanOrEqual(1);
      expect(result.factors.impact).toBeGreaterThanOrEqual(0);
    });

    it("should apply uncertainty multiplier", () => {
      const resultNoUncertainty = evaluateTrigger("low", 0.4, 0.4, 0);
      const resultWithUncertainty = evaluateTrigger("low", 0.4, 0.4, 0.5);

      expect(resultWithUncertainty.score).toBeGreaterThan(resultNoUncertainty.score);
    });

    it("should handle custom threshold config", () => {
      const customConfig = {
        ...DEFAULT_THRESHOLD_CONFIG,
        ambiguityThreshold: 0.8,
        impactThreshold: 0.9,
      };

      const result = evaluateTrigger("low", 0.7, 0.7, 0, customConfig);
      expect(result.shouldTriggerCFE).toBe(false); // Below custom thresholds
    });
  });

  describe("Complexity Weighting", () => {
    it("should weight low complexity lower than high", () => {
      const lowResult = evaluateTrigger("low", 0.5, 0.5);
      const highResult = evaluateTrigger("high", 0.5, 0.5);

      expect(highResult.score).toBeGreaterThan(lowResult.score);
    });

    it("should weight medium complexity between low and high", () => {
      const lowResult = evaluateTrigger("low", 0.5, 0.5);
      const mediumResult = evaluateTrigger("medium", 0.5, 0.5);
      const highResult = evaluateTrigger("high", 0.5, 0.5);

      expect(mediumResult.score).toBeGreaterThan(lowResult.score);
      expect(highResult.score).toBeGreaterThan(mediumResult.score);
    });
  });

  describe("Adaptive Adjustment", () => {
    it("should increase thresholds when fast path performs well", () => {
      const adjusted = adaptiveAdjustment(DEFAULT_THRESHOLD_CONFIG, {
        fastPathAccuracy: 0.9,
        deepPathAccuracy: 0.85,
        fastPathLatency: 500,
        deepPathLatency: 3000,
        costPerFastPath: 1,
        costPerDeepPath: 5,
      });

      expect(adjusted.ambiguityThreshold).toBeGreaterThan(DEFAULT_THRESHOLD_CONFIG.ambiguityThreshold);
      expect(adjusted.impactThreshold).toBeGreaterThan(DEFAULT_THRESHOLD_CONFIG.impactThreshold);
    });

    it("should decrease thresholds when deep path is more accurate", () => {
      const adjusted = adaptiveAdjustment(DEFAULT_THRESHOLD_CONFIG, {
        fastPathAccuracy: 0.6,
        deepPathAccuracy: 0.9,
        fastPathLatency: 500,
        deepPathLatency: 3000,
        costPerFastPath: 1,
        costPerDeepPath: 5,
      });

      expect(adjusted.ambiguityThreshold).toBeLessThan(DEFAULT_THRESHOLD_CONFIG.ambiguityThreshold);
      expect(adjusted.impactThreshold).toBeLessThan(DEFAULT_THRESHOLD_CONFIG.impactThreshold);
    });

    it("should maintain threshold bounds", () => {
      const adjusted = adaptiveAdjustment(DEFAULT_THRESHOLD_CONFIG, {
        fastPathAccuracy: 0.5,
        deepPathAccuracy: 0.95,
        fastPathLatency: 1000,
        deepPathLatency: 2000,
        costPerFastPath: 1,
        costPerDeepPath: 100,
      });

      expect(adjusted.ambiguityThreshold).toBeGreaterThanOrEqual(0.3);
      expect(adjusted.ambiguityThreshold).toBeLessThanOrEqual(0.7);
      expect(adjusted.impactThreshold).toBeGreaterThanOrEqual(0.4);
      expect(adjusted.impactThreshold).toBeLessThanOrEqual(0.8);
    });

    it("should adjust uncertainty multiplier based on cost", () => {
      const adjusted = adaptiveAdjustment(DEFAULT_THRESHOLD_CONFIG, {
        fastPathAccuracy: 0.7,
        deepPathAccuracy: 0.75,
        fastPathLatency: 500,
        deepPathLatency: 5000,
        costPerFastPath: 1,
        costPerDeepPath: 50,
      });

      expect(adjusted.uncertaintyMultiplier).toBeLessThan(DEFAULT_THRESHOLD_CONFIG.uncertaintyMultiplier);
    });
  });

  describe("Configuration Validation", () => {
    it("should validate correct configuration", () => {
      const result = validateThresholdConfig(DEFAULT_THRESHOLD_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject invalid ambiguity threshold", () => {
      const invalid = {
        ...DEFAULT_THRESHOLD_CONFIG,
        ambiguityThreshold: 1.5,
      };
      const result = validateThresholdConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject invalid impact threshold", () => {
      const invalid = {
        ...DEFAULT_THRESHOLD_CONFIG,
        impactThreshold: -0.1,
      };
      const result = validateThresholdConfig(invalid);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid uncertainty multiplier", () => {
      const invalid = {
        ...DEFAULT_THRESHOLD_CONFIG,
        uncertaintyMultiplier: 3,
      };
      const result = validateThresholdConfig(invalid);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid complexity weights order", () => {
      const invalid = {
        ...DEFAULT_THRESHOLD_CONFIG,
        complexityWeights: {
          low: 0.8,
          medium: 0.6,
          high: 0.4,
        },
      };
      const result = validateThresholdConfig(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe("Default Configuration", () => {
    it("should have valid default config", () => {
      const result = validateThresholdConfig(DEFAULT_THRESHOLD_CONFIG);
      expect(result.valid).toBe(true);
    });

    it("should have reasonable default values", () => {
      expect(DEFAULT_THRESHOLD_CONFIG.ambiguityThreshold).toBe(0.5);
      expect(DEFAULT_THRESHOLD_CONFIG.impactThreshold).toBe(0.6);
      expect(DEFAULT_THRESHOLD_CONFIG.uncertaintyMultiplier).toBe(1.5);
    });

    it("should have ascending complexity weights", () => {
      const weights = DEFAULT_THRESHOLD_CONFIG.complexityWeights;
      expect(weights.low).toBeLessThan(weights.medium);
      expect(weights.medium).toBeLessThan(weights.high);
    });
  });

  describe("Trigger Factors", () => {
    it("should calculate all factors", () => {
      const result = evaluateTrigger("medium", 0.6, 0.7, 0.3);

      expect(result.factors.complexity).toBeDefined();
      expect(result.factors.ambiguity).toBeDefined();
      expect(result.factors.impact).toBeDefined();
      expect(result.factors.uncertainty).toBeDefined();
    });

    it("should reflect input values in factors", () => {
      const result = evaluateTrigger("low", 0.6, 0.7, 0.3);

      expect(result.factors.ambiguity).toBe(0.6);
      expect(result.factors.impact).toBe(0.7);
      expect(result.factors.uncertainty).toBe(0.3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero values", () => {
      const result = evaluateTrigger("low", 0, 0, 0);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("should handle maximum values", () => {
      const result = evaluateTrigger("high", 1, 1, 1);
      expect(result.shouldTriggerCFE).toBe(true);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("should handle mixed scenarios", () => {
      const scenarios = [
        { complexity: "low" as const, ambiguity: 0.9, impact: 0.1 },
        { complexity: "medium" as const, ambiguity: 0.1, impact: 0.9 },
        { complexity: "high" as const, ambiguity: 0.5, impact: 0.5 },
      ];

      scenarios.forEach((scenario) => {
        const result = evaluateTrigger(scenario.complexity, scenario.ambiguity, scenario.impact);
        expect(result.shouldTriggerCFE).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });
});
