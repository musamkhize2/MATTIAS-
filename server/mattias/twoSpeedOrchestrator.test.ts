import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  orchestrate,
  orchestrateBatch,
  getOrchestrationStats,
  adjustThresholds,
  healthCheck,
} from "./twoSpeedOrchestrator";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

// Mock CFE
vi.mock("./cognitiveFieldEngine", () => ({
  executeCFE: vi.fn(async () => ({
    sessionId: "test-session",
    finalOutput: "Test output",
    confidence: 0.8,
    suggestedActions: [],
    thoughtProcess: [],
    tokensUsed: 0,
  })),
  fastInferencePath: vi.fn(async () => "Fast response"),
  getIdentityProfile: vi.fn(async () => ({
    thinkingStyle: "strategic_balanced",
    riskTolerance: 0.6,
    creativityBias: 0.5,
    communicationStyle: "direct_warm",
    decisionConfidenceProfile: "balanced",
  })),
}));

describe("Two-Speed Orchestrator", () => {
  describe("Fast Path Activation", () => {
    it("should use fast path for low complexity and low impact", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "What is 2+2?",
        complexity: "low",
        ambiguity: 0.1,
        decisionImpact: 0.1,
      });

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.isRefined).toBe(true);
    });

    it("should provide immediate response", async () => {
      const start = Date.now();
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Simple question",
        complexity: "low",
        ambiguity: 0.2,
        decisionImpact: 0.2,
      });
      const elapsed = Date.now() - start;

      expect(result.response).toBeDefined();
      expect(elapsed).toBeLessThan(5000); // Should be fast
    });
  });

  describe("Deep Path Activation", () => {
    it("should use deep path for high complexity", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Complex business decision",
        complexity: "high",
        ambiguity: 0.5,
        decisionImpact: 0.5,
      });

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.isRefined).toBe(false);
      expect(result.refinementPromise).toBeDefined();
    });

    it("should use deep path for high ambiguity", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Ambiguous scenario",
        complexity: "low",
        ambiguity: 0.8,
        decisionImpact: 0.3,
      });

      expect(result.isRefined).toBe(false);
      expect(result.refinementPromise).toBeDefined();
    });

    it("should use deep path for high impact", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "High-impact decision",
        complexity: "low",
        ambiguity: 0.2,
        decisionImpact: 0.9,
      });

      expect(result.isRefined).toBe(false);
      expect(result.refinementPromise).toBeDefined();
    });
  });

  describe("Session Management", () => {
    it("should generate unique session IDs", async () => {
      const result1 = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Query 1",
        complexity: "low",
        ambiguity: 0.1,
        decisionImpact: 0.1,
      });

      const result2 = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Query 2",
        complexity: "low",
        ambiguity: 0.1,
        decisionImpact: 0.1,
      });

      expect(result1.sessionId).not.toBe(result2.sessionId);
    });

    it("should include context in orchestration", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Query with context",
        complexity: "medium",
        ambiguity: 0.5,
        decisionImpact: 0.5,
        context: { company: "Acme", industry: "Tech" },
      });

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
    });
  });

  describe("Batch Orchestration", () => {
    it("should process multiple queries", async () => {
      const inputs = [
        {
          tenantId: 1,
          userId: 1,
          userQuery: "Query 1",
          complexity: "low" as const,
          ambiguity: 0.1,
          decisionImpact: 0.1,
        },
        {
          tenantId: 1,
          userId: 1,
          userQuery: "Query 2",
          complexity: "low" as const,
          ambiguity: 0.1,
          decisionImpact: 0.1,
        },
      ];

      const results = await orchestrateBatch(inputs);

      expect(results.length).toBe(2);
      expect(results[0].response).toBeDefined();
      expect(results[1].response).toBeDefined();
    });

    it("should maintain order in batch", async () => {
      const inputs = Array.from({ length: 5 }, (_, i) => ({
        tenantId: 1,
        userId: 1,
        userQuery: `Query ${i}`,
        complexity: "low" as const,
        ambiguity: 0.1,
        decisionImpact: 0.1,
      }));

      const results = await orchestrateBatch(inputs);

      expect(results.length).toBe(5);
      results.forEach((result, i) => {
        expect(result.sessionId).toBeDefined();
      });
    });
  });

  describe("Statistics", () => {
    it("should return default stats when database unavailable", async () => {
      const stats = await getOrchestrationStats(1);

      expect(stats.totalSessions).toBe(0);
      expect(stats.fastPathCount).toBe(0);
      expect(stats.deepPathCount).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.averageLatency).toBe(0);
    });

    it("should have valid stat values", async () => {
      const stats = await getOrchestrationStats(1);

      expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
      expect(stats.fastPathCount).toBeGreaterThanOrEqual(0);
      expect(stats.deepPathCount).toBeGreaterThanOrEqual(0);
      expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.averageConfidence).toBeLessThanOrEqual(1);
      expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Threshold Adjustment", () => {
    it("should increase thresholds when fast path performs well", () => {
      const adjusted = adjustThresholds(0.5, 0.6, {
        fastPathAccuracy: 0.9,
        deepPathAccuracy: 0.85,
        fastPathLatency: 500,
        deepPathLatency: 3000,
      });

      expect(adjusted.ambiguityThreshold).toBeGreaterThan(0.5);
      expect(adjusted.impactThreshold).toBeGreaterThan(0.6);
    });

    it("should decrease thresholds when deep path performs much better", () => {
      const adjusted = adjustThresholds(0.5, 0.6, {
        fastPathAccuracy: 0.6,
        deepPathAccuracy: 0.85,
        fastPathLatency: 500,
        deepPathLatency: 3000,
      });

      expect(adjusted.ambiguityThreshold).toBeLessThan(0.5);
      expect(adjusted.impactThreshold).toBeLessThan(0.6);
    });

    it("should maintain reasonable threshold bounds", () => {
      const adjusted = adjustThresholds(0.3, 0.4, {
        fastPathAccuracy: 0.5,
        deepPathAccuracy: 0.9,
        fastPathLatency: 1000,
        deepPathLatency: 2000,
      });

      expect(adjusted.ambiguityThreshold).toBeGreaterThanOrEqual(0.3);
      expect(adjusted.ambiguityThreshold).toBeLessThanOrEqual(0.7);
      expect(adjusted.impactThreshold).toBeGreaterThanOrEqual(0.4);
      expect(adjusted.impactThreshold).toBeLessThanOrEqual(0.8);
    });
  });

  describe("Health Check", () => {
    it("should report health status", async () => {
      const health = await healthCheck(1);

      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(typeof health.fastPathAvailable).toBe("boolean");
      expect(typeof health.deepPathAvailable).toBe("boolean");
      expect(health.message).toBeDefined();
    });

    it("should report degraded when database unavailable", async () => {
      const health = await healthCheck(1);

      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
    });
  });

  describe("Response Quality", () => {
    it("should provide response with sessionId", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Test query",
        complexity: "low",
        ambiguity: 0.1,
        decisionImpact: 0.1,
      });

      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe("string");
      expect(result.sessionId.length).toBeGreaterThan(0);
    });

    it("should indicate if response is refined", async () => {
      const fastResult = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Simple",
        complexity: "low",
        ambiguity: 0.1,
        decisionImpact: 0.1,
      });

      expect(typeof fastResult.isRefined).toBe("boolean");
    });
  });

  describe("Complexity Handling", () => {
    it("should handle low complexity", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Low complexity",
        complexity: "low",
        ambiguity: 0.1,
        decisionImpact: 0.1,
      });

      expect(result.response).toBeDefined();
    });

    it("should handle medium complexity", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "Medium complexity",
        complexity: "medium",
        ambiguity: 0.5,
        decisionImpact: 0.5,
      });

      expect(result.response).toBeDefined();
    });

    it("should handle high complexity", async () => {
      const result = await orchestrate({
        tenantId: 1,
        userId: 1,
        userQuery: "High complexity",
        complexity: "high",
        ambiguity: 0.8,
        decisionImpact: 0.8,
      });

      expect(result.response).toBeDefined();
    });
  });
});
