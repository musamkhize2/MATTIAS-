import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { events, cognitiveMemory } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * Dual Memory System
 * Immutable Truth Layer (events) + Cognitive Memory Layer (embeddings)
 */

export interface MemorySummary {
  id: string;
  eventId: number;
  originalContent: string;
  summarizedContent: string;
  embedding: number[];
  distortionScore: number;
  metadata: Record<string, any>;
}

export interface EventTruth {
  id: number;
  tenantId: number;
  eventType: string;
  aggregateId: string;
  data: Record<string, any>;
  occurrenceTime: Date;
}

/**
 * Immutable Truth Layer: Retrieve events as they occurred
 */
export async function getTruthLayerEvents(
  tenantId: number,
  limit: number = 100
): Promise<EventTruth[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenantId))
    .orderBy(events.createdAt)
    .limit(limit);

  return result.map((e) => ({
    id: Number(e.id),
    tenantId: e.tenantId,
    eventType: e.eventType,
    aggregateId: e.aggregateId,
    data: e.data as Record<string, any>,
    occurrenceTime: e.occurrenceTime,
  }));
}

/**
 * Generate embedding for text content
 * In production, this would use a real embedding model
 */
export function generateEmbedding(text: string): number[] {
  // Simple hash-based embedding for demonstration
  // In production, use OpenAI embeddings or similar
  const hash = text.split("").reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);

  const embedding: number[] = [];
  for (let i = 0; i < 384; i++) {
    embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
  }
  return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Summarize event using LLM
 */
export async function summarizeEvent(eventData: Record<string, any>): Promise<string> {
  const prompt = `Summarize this business event concisely (1-2 sentences): ${JSON.stringify(eventData)}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a business memory system. Summarize events concisely.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === "string" ? content : "Event recorded.";
  } catch (error) {
    console.error("Error summarizing event:", error);
    return JSON.stringify(eventData);
  }
}

/**
 * Add event to cognitive memory layer
 */
export async function addToCognitiveMemory(
  tenantId: number,
  eventId: number,
  originalContent: string,
  metadata?: Record<string, any>
): Promise<MemorySummary> {
  const db = await getDb();
  if (!db) {
    return {
      id: uuidv4(),
      eventId,
      originalContent,
      summarizedContent: originalContent,
      embedding: generateEmbedding(originalContent),
      distortionScore: 0,
      metadata: metadata || {},
    };
  }

  // Generate summary
  const summarizedContent = await summarizeEvent({ content: originalContent, ...metadata });

  // Generate embedding
  const embedding = generateEmbedding(summarizedContent);

  // Calculate distortion (how far summary is from original)
  const originalEmbedding = generateEmbedding(originalContent);
  const distortionScore = 1 - cosineSimilarity(originalEmbedding, embedding);

  // Store in cognitive memory
  const result = await db.insert(cognitiveMemory).values({
    tenantId,
    eventId,
    originalContent,
    summarizedContent,
    embedding: JSON.stringify(embedding),
    distortionScore,
    metadata: JSON.stringify(metadata || {}),
  });

  return {
    id: uuidv4(),
    eventId,
    originalContent,
    summarizedContent,
    embedding,
    distortionScore,
    metadata: metadata || {},
  };
}

/**
 * Search cognitive memory by semantic similarity
 */
export async function searchCognitiveMemory(
  tenantId: number,
  query: string,
  threshold: number = 0.5,
  limit: number = 10
): Promise<MemorySummary[]> {
  const db = await getDb();
  if (!db) return [];

  const queryEmbedding = generateEmbedding(query);

  const allMemories = await db
    .select()
    .from(cognitiveMemory)
    .where(eq(cognitiveMemory.tenantId, tenantId))
    .limit(100);

  // Calculate similarity for each memory
  const scored = allMemories
    .map((m) => {
      const embedding = JSON.parse((m.embedding as any) || "[]") as number[];
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return {
        memory: m,
        similarity,
      };
    })
    .filter((s) => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored.map((s) => ({
    id: uuidv4(),
    eventId: s.memory.eventId || 0,
    originalContent: s.memory.originalContent || "",
    summarizedContent: s.memory.summarizedContent || "",
    embedding: JSON.parse((s.memory.embedding as any) || "[]"),
    distortionScore: s.memory.distortionScore || 0,
    metadata: JSON.parse((s.memory.metadata as any) || "{}"),
  }));
}

/**
 * Detect memory drift (distortion from original)
 */
export async function detectMemoryDrift(
  tenantId: number,
  maxDistortion: number = 0.3
): Promise<MemorySummary[]> {
  const db = await getDb();
  if (!db) return [];

  const driftedMemories = await db
    .select()
    .from(cognitiveMemory)
    .where(
      and(
        eq(cognitiveMemory.tenantId, tenantId),
        // Note: Drizzle doesn't support direct comparison operators in where
        // This is a simplified check
      )
    )
    .limit(100);

  return driftedMemories
    .filter((m) => (m.distortionScore || 0) > maxDistortion)
    .map((m) => ({
      id: uuidv4(),
      eventId: m.eventId || 0,
      originalContent: m.originalContent || "",
      summarizedContent: m.summarizedContent || "",
    embedding: JSON.parse((m.embedding as any) || "[]"),
    distortionScore: m.distortionScore || 0,
    metadata: JSON.parse((m.metadata as any) || "{}"),
    }));
}

/**
 * Reset memory summary from truth layer
 */
export async function resetMemoryFromTruth(
  tenantId: number,
  eventId: number
): Promise<MemorySummary | null> {
  const db = await getDb();
  if (!db) return null;

  // Get original event from truth layer
  const eventResult = await db
    .select()
    .from(events)
    .where(and(eq(events.tenantId, tenantId), eq(events.id, eventId as any)))
    .limit(1);

  if (eventResult.length === 0) return null;

  const event = eventResult[0];
  const originalContent = JSON.stringify(event.data);

  // Generate fresh summary
  const summarizedContent = await summarizeEvent(event.data as Record<string, any>);
  const embedding = generateEmbedding(summarizedContent);
  const originalEmbedding = generateEmbedding(originalContent);
  const distortionScore = 1 - cosineSimilarity(originalEmbedding, embedding);

  // Update cognitive memory
  await db
    .update(cognitiveMemory)
    .set({
      summarizedContent,
      embedding: JSON.stringify(embedding),
      distortionScore,
    })
    .where(
      and(
        eq(cognitiveMemory.tenantId, tenantId),
        eq(cognitiveMemory.eventId, eventId)
      )
    );

  return {
    id: uuidv4(),
    eventId,
    originalContent,
    summarizedContent,
    embedding,
    distortionScore,
    metadata: {},
  };
}

/**
 * Get memory statistics for a tenant
 */
export async function getMemoryStats(tenantId: number): Promise<{
  totalEvents: number;
  totalMemories: number;
  averageDistortion: number;
  highDriftCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalEvents: 0,
      totalMemories: 0,
      averageDistortion: 0,
      highDriftCount: 0,
    };
  }

  const eventCount = await db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenantId));

  const memories = await db
    .select()
    .from(cognitiveMemory)
    .where(eq(cognitiveMemory.tenantId, tenantId));

  const averageDistortion =
    memories.length > 0
      ? memories.reduce((sum, m) => sum + (m.distortionScore || 0), 0) / memories.length
      : 0;

  const highDriftCount = memories.filter((m) => (m.distortionScore || 0) > 0.3).length;

  return {
    totalEvents: eventCount.length,
    totalMemories: memories.length,
    averageDistortion,
    highDriftCount,
  };
}

/**
 * Reindex cognitive memory (daily task)
 */
export async function reindexCognitiveMemory(tenantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const memories = await db
    .select()
    .from(cognitiveMemory)
    .where(eq(cognitiveMemory.tenantId, tenantId));

  let reindexedCount = 0;

  for (const memory of memories) {
    try {
      // Regenerate summary to keep it fresh
      const originalData = JSON.parse((memory.originalContent as any) || "{}");
      const newSummary = await summarizeEvent(originalData);

      const newEmbedding = generateEmbedding(newSummary);
      const originalEmbedding = generateEmbedding(memory.originalContent || "");
      const newDistortion = 1 - cosineSimilarity(originalEmbedding, newEmbedding);

      await db
        .update(cognitiveMemory)
        .set({
          summarizedContent: newSummary,
          embedding: JSON.stringify(newEmbedding),
          distortionScore: newDistortion,
          updatedAt: new Date(),
        })
        .where(eq(cognitiveMemory.id, memory.id));

      reindexedCount++;
    } catch (error) {
      console.error(`Error reindexing memory ${memory.id}:`, error);
    }
  }

  return reindexedCount;
}
