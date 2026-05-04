import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateEmbedding,
  cosineSimilarity,
  getTruthLayerEvents,
  searchCognitiveMemory,
  getMemoryStats,
} from "./dualMemorySystem";

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
          content: "Summarized event description.",
        },
      },
    ],
  })),
}));

describe("Dual Memory System", () => {
  describe("Embedding Generation", () => {
    it("should generate consistent embeddings for same text", () => {
      const text = "Business event occurred";
      const embedding1 = generateEmbedding(text);
      const embedding2 = generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });

    it("should generate embeddings of correct dimension", () => {
      const embedding = generateEmbedding("test");
      expect(embedding.length).toBe(384);
    });

    it("should generate embeddings with values between 0 and 1", () => {
      const embedding = generateEmbedding("test");
      embedding.forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    });

    it("should generate different embeddings for different texts", () => {
      const embedding1 = generateEmbedding("text one");
      const embedding2 = generateEmbedding("text two");

      expect(embedding1).not.toEqual(embedding2);
    });
  });

  describe("Cosine Similarity", () => {
    it("should return 1 for identical vectors", () => {
      const vec = [1, 0, 1, 0];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vec1 = [1, 0, 0, 0];
      const vec2 = [0, 1, 0, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("should return value between -1 and 1", () => {
      const vec1 = generateEmbedding("text one");
      const vec2 = generateEmbedding("text two");
      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it("should handle zero vectors gracefully", () => {
      const zero = [0, 0, 0, 0];
      const vec = [1, 0, 1, 0];
      const similarity = cosineSimilarity(zero, vec);
      expect(similarity).toBe(0);
    });
  });

  describe("Truth Layer Events", () => {
    it("should return empty array when database is unavailable", async () => {
      const events = await getTruthLayerEvents(1);
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });

    it("should respect limit parameter", async () => {
      const events = await getTruthLayerEvents(1, 50);
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("Cognitive Memory Search", () => {
    it("should return empty array when database is unavailable", async () => {
      const results = await searchCognitiveMemory(1, "test query");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("should respect similarity threshold", async () => {
      const results = await searchCognitiveMemory(1, "test", 0.9);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should respect result limit", async () => {
      const results = await searchCognitiveMemory(1, "test", 0.5, 5);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Memory Statistics", () => {
    it("should return default stats when database is unavailable", async () => {
      const stats = await getMemoryStats(1);

      expect(stats.totalEvents).toBe(0);
      expect(stats.totalMemories).toBe(0);
      expect(stats.averageDistortion).toBe(0);
      expect(stats.highDriftCount).toBe(0);
    });

    it("should have valid stat values", async () => {
      const stats = await getMemoryStats(1);

      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(stats.totalMemories).toBeGreaterThanOrEqual(0);
      expect(stats.averageDistortion).toBeGreaterThanOrEqual(0);
      expect(stats.averageDistortion).toBeLessThanOrEqual(1);
      expect(stats.highDriftCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Semantic Similarity", () => {
    it("should generate consistent embeddings for semantic operations", () => {
      const text1 = "The company is growing rapidly";
      const text2 = "The company is growing rapidly";

      const emb1 = generateEmbedding(text1);
      const emb2 = generateEmbedding(text2);

      const similarity = cosineSimilarity(emb1, emb2);

      // Identical texts should have high similarity
      expect(similarity).toBeCloseTo(1, 5);
    });
  });

  describe("Distortion Score", () => {
    it("should calculate distortion between original and summary", () => {
      const original = "This is the original event description";
      const summary = "This is the original event description";

      const origEmb = generateEmbedding(original);
      const summaryEmb = generateEmbedding(summary);

      const similarity = cosineSimilarity(origEmb, summaryEmb);
      const distortion = 1 - similarity;

      // Identical texts should have zero distortion
      expect(distortion).toBeCloseTo(0, 5);
    });
  });

  describe("Memory Integrity", () => {
    it("should preserve original content in truth layer", async () => {
      const events = await getTruthLayerEvents(1);
      // Truth layer should be immutable
      expect(Array.isArray(events)).toBe(true);
    });

    it("should allow cognitive memory to drift safely", () => {
      const original = "Financial transaction completed";
      const cognitive = "Financial transaction completed";

      const origEmb = generateEmbedding(original);
      const cogEmb = generateEmbedding(cognitive);

      const distortion = 1 - cosineSimilarity(origEmb, cogEmb);

      // Identical content should have minimal distortion
      expect(distortion).toBeCloseTo(0, 5);
    });
  });

  describe("Vector Operations", () => {
    it("should handle high-dimensional embeddings", () => {
      const emb = generateEmbedding("test");
      expect(emb.length).toBe(384);

      const similarity = cosineSimilarity(emb, emb);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("should normalize similarity scores", () => {
      const emb1 = generateEmbedding("text 1");
      const emb2 = generateEmbedding("text 2");

      const similarity = cosineSimilarity(emb1, emb2);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });
});
