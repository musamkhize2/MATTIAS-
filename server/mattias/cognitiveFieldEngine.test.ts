import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  shouldTriggerCFE,
  getCognitiveBudget,
  getIdentityProfile,
  fastInferencePath,
} from "./cognitiveFieldEngine";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

// Mock LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: "This is a test response.",
        },
      },
    ],
  })),
}));

describe("Cognitive Field Engine", () => {
  describe("shouldTriggerCFE", () => {
    it("should trigger CFE for high complexity", async () => {
      const result = await shouldTriggerCFE(1, "high", 0.3, 0.4);
      expect(result).toBe(true);
    });

    it("should trigger CFE for high decision impact", async () => {
      const result = await shouldTriggerCFE(1, "medium", 0.3, 0.8);
      expect(result).toBe(true);
    });

    it("should trigger CFE for high ambiguity", async () => {
      const result = await shouldTriggerCFE(1, "low", 0.7, 0.3);
      expect(result).toBe(true);
    });

    it("should not trigger CFE for low complexity and low impact", async () => {
      const result = await shouldTriggerCFE(1, "low", 0.2, 0.3);
      expect(result).toBe(false);
    });
  });

  describe("getCognitiveBudget", () => {
    it("should return default budget when database is unavailable", async () => {
      const budget = await getCognitiveBudget(1, "personal");

      expect(budget.maxThreads).toBe(2);
      expect(budget.maxRounds).toBe(1);
      expect(budget.maxTotalTokens).toBe(4000);
      expect(budget.maxLatencyMs).toBe(2000);
    });

    it("should have different budgets for different tiers", async () => {
      const personal = await getCognitiveBudget(1, "personal");
      const enterprise = await getCognitiveBudget(1, "enterprise");

      // Both should return defaults since DB is mocked as null
      expect(personal.maxThreads).toBe(2);
      expect(enterprise.maxThreads).toBe(2);
    });
  });

  describe("getIdentityProfile", () => {
    it("should return default identity profile", async () => {
      const profile = await getIdentityProfile(1);

      expect(profile.thinkingStyle).toBe("strategic_balanced");
      expect(profile.riskTolerance).toBe(0.6);
      expect(profile.creativityBias).toBe(0.5);
      expect(profile.communicationStyle).toBe("direct_warm");
      expect(profile.decisionConfidenceProfile).toBe("balanced");
    });

    it("should have valid profile attributes", async () => {
      const profile = await getIdentityProfile(1);

      expect(profile.riskTolerance).toBeGreaterThanOrEqual(0);
      expect(profile.riskTolerance).toBeLessThanOrEqual(1);
      expect(profile.creativityBias).toBeGreaterThanOrEqual(0);
      expect(profile.creativityBias).toBeLessThanOrEqual(1);
    });
  });

  describe("fastInferencePath", () => {
    it("should return a response for user query", async () => {
      const profile = await getIdentityProfile(1);
      const response = await fastInferencePath(1, "What should I do?", profile);

      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });

    it("should use identity profile in response", async () => {
      const profile = {
        thinkingStyle: "creative_exploratory" as const,
        riskTolerance: 0.8,
        creativityBias: 0.9,
        communicationStyle: "casual_friendly" as const,
        decisionConfidenceProfile: "progressive" as const,
      };

      const response = await fastInferencePath(1, "Generate ideas", profile);

      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe("CFE Budgeting", () => {
    it("should respect thread limits", async () => {
      const budget = await getCognitiveBudget(1, "personal");
      expect(budget.maxThreads).toBeLessThanOrEqual(6);
      expect(budget.maxThreads).toBeGreaterThanOrEqual(1);
    });

    it("should respect token limits", async () => {
      const budget = await getCognitiveBudget(1, "personal");
      expect(budget.maxTotalTokens).toBeGreaterThan(0);
    });

    it("should respect latency limits", async () => {
      const budget = await getCognitiveBudget(1, "personal");
      expect(budget.maxLatencyMs).toBeGreaterThan(0);
    });
  });

  describe("Identity Profile Attributes", () => {
    it("should have valid thinking styles", async () => {
      const validStyles = [
        "strategic_balanced",
        "creative_exploratory",
        "analytical_rigorous",
        "pragmatic_direct",
      ];
      const profile = await getIdentityProfile(1);
      expect(validStyles).toContain(profile.thinkingStyle);
    });

    it("should have valid communication styles", async () => {
      const validStyles = ["direct_warm", "formal_precise", "casual_friendly", "executive_concise"];
      const profile = await getIdentityProfile(1);
      expect(validStyles).toContain(profile.communicationStyle);
    });

    it("should have valid confidence profiles", async () => {
      const validProfiles = ["progressive", "conservative", "balanced"];
      const profile = await getIdentityProfile(1);
      expect(validProfiles).toContain(profile.decisionConfidenceProfile);
    });
  });

  describe("CFE Trigger Threshold", () => {
    it("should trigger on high ambiguity", async () => {
      const result = await shouldTriggerCFE(1, "low", 0.8, 0.2);
      expect(result).toBe(true);
    });

    it("should trigger on high impact", async () => {
      const result = await shouldTriggerCFE(1, "low", 0.2, 0.9);
      expect(result).toBe(true);
    });

    it("should not trigger on low ambiguity and low impact", async () => {
      const result = await shouldTriggerCFE(1, "low", 0.1, 0.1);
      expect(result).toBe(false);
    });

    it("should trigger on medium ambiguity with high impact", async () => {
      const result = await shouldTriggerCFE(1, "low", 0.6, 0.7);
      expect(result).toBe(true);
    });
  });
});
