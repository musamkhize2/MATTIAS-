import { v4 as uuidv4 } from "uuid";
import { executeCFE, fastInferencePath, getIdentityProfile } from "./cognitiveFieldEngine";
import { getDb } from "../db";
import { cognitiveSessions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Two-Speed Orchestrator
 * Fast response (1-2s) + deep background processing for complex decisions
 */

export interface OrchestratorInput {
  tenantId: number;
  userId: number;
  eventId?: number;
  userQuery: string;
  complexity: "low" | "medium" | "high";
  ambiguity: number; // 0-1
  decisionImpact: number; // 0-1
  context?: Record<string, any>;
}

export interface FastResponse {
  sessionId: string;
  response: string;
  isRefined: boolean;
  refinementPromise?: Promise<RefinedResponse>;
}

export interface RefinedResponse {
  sessionId: string;
  refinedResponse: string;
  confidence: number;
  suggestedActions: any[];
  thoughtProcess: any[];
}

/**
 * Determine if deep path (CFE) should be triggered
 */
function shouldUseDeePathPath(
  complexity: "low" | "medium" | "high",
  ambiguity: number,
  decisionImpact: number
): boolean {
  // Thresholds
  const ambiguityThreshold = 0.5;
  const impactThreshold = 0.6;

  // Always use deep path for high complexity
  if (complexity === "high") {
    return true;
  }

  // Use deep path if ambiguity or impact is high
  if (ambiguity > ambiguityThreshold || decisionImpact > impactThreshold) {
    return true;
  }

  // Otherwise use fast path
  return false;
}

/**
 * Fast path: Single LLM call with immediate response
 */
async function fastPath(
  tenantId: number,
  userQuery: string
): Promise<{ response: string; confidence: number }> {
  const identity = await getIdentityProfile(tenantId);

  try {
    const response = await fastInferencePath(tenantId, userQuery, identity);
    return {
      response,
      confidence: 0.7, // Fast path has moderate confidence
    };
  } catch (error) {
    console.error("Fast path error:", error);
    return {
      response: "I'm processing your request. Please wait for a more complete analysis.",
      confidence: 0.3,
    };
  }
}

/**
 * Deep path: Full CFE with multiple threads
 */
async function deepPath(
  tenantId: number,
  userId: number,
  userQuery: string,
  eventId?: number,
  context?: Record<string, any>
): Promise<RefinedResponse> {
  const sessionId = uuidv4();

  try {
    const result = await executeCFE({
      tenantId,
      userId,
      eventId,
      mode: "focus",
      complexity: "high",
      userQuery,
      context,
    });

    return {
      sessionId: result.sessionId,
      refinedResponse: result.finalOutput,
      confidence: result.confidence,
      suggestedActions: result.suggestedActions,
      thoughtProcess: result.thoughtProcess,
    };
  } catch (error) {
    console.error("Deep path error:", error);
    return {
      sessionId,
      refinedResponse: "Unable to complete deep analysis at this time.",
      confidence: 0.2,
      suggestedActions: [],
      thoughtProcess: [],
    };
  }
}

/**
 * Main orchestrator: Two-speed thinking
 */
export async function orchestrate(input: OrchestratorInput): Promise<FastResponse> {
  const sessionId = uuidv4();
  const shouldUseDeepPath = shouldUseDeePathPath(input.complexity, input.ambiguity, input.decisionImpact);

  // Always provide fast response
  const fastResult = await fastPath(input.tenantId, input.userQuery);

  if (shouldUseDeepPath) {
    // Start deep path asynchronously
    const refinementPromise = deepPath(
      input.tenantId,
      input.userId,
      input.userQuery,
      input.eventId,
      input.context
    ).then(async (refined) => {
      // Optionally notify user of refinement
      console.log(`[${sessionId}] Refinement complete for tenant ${input.tenantId}`);
      return refined;
    });

    return {
      sessionId,
      response: fastResult.response,
      isRefined: false,
      refinementPromise,
    };
  } else {
    // No deep path needed, fast path is sufficient
    return {
      sessionId,
      response: fastResult.response,
      isRefined: true,
    };
  }
}

/**
 * Get refined response (wait for background processing)
 */
export async function getRefinedResponse(
  sessionId: string,
  refinementPromise: Promise<RefinedResponse>,
  timeoutMs: number = 30000
): Promise<RefinedResponse> {
  try {
    const refined = await Promise.race([
      refinementPromise,
      new Promise<RefinedResponse>((_, reject) =>
        setTimeout(() => reject(new Error("Refinement timeout")), timeoutMs)
      ),
    ]);

    return refined;
  } catch (error) {
    console.error(`Refinement failed for session ${sessionId}:`, error);
    return {
      sessionId,
      refinedResponse: "Refinement process timed out. Using initial response.",
      confidence: 0.5,
      suggestedActions: [],
      thoughtProcess: [],
    };
  }
}

/**
 * Stream-based orchestrator for real-time updates
 */
export async function orchestrateWithStreaming(
  input: OrchestratorInput,
  onFastResponse: (response: FastResponse) => void,
  onRefinement?: (refined: RefinedResponse) => void
): Promise<void> {
  // Send fast response immediately
  const fastResult = await orchestrate(input);
  onFastResponse(fastResult);

  // If refinement is available, wait for it and send update
  if (fastResult.refinementPromise && onRefinement) {
    try {
      const refined = await fastResult.refinementPromise;
      onRefinement(refined);
    } catch (error) {
      console.error("Streaming refinement error:", error);
    }
  }
}

/**
 * Batch orchestration for multiple queries
 */
export async function orchestrateBatch(
  inputs: OrchestratorInput[]
): Promise<FastResponse[]> {
  return Promise.all(inputs.map((input) => orchestrate(input)));
}

/**
 * Get orchestration statistics
 */
export async function getOrchestrationStats(tenantId: number): Promise<{
  totalSessions: number;
  fastPathCount: number;
  deepPathCount: number;
  averageConfidence: number;
  averageLatency: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalSessions: 0,
      fastPathCount: 0,
      deepPathCount: 0,
      averageConfidence: 0,
      averageLatency: 0,
    };
  }

  const sessions = await db
    .select()
    .from(cognitiveSessions)
    .where(eq(cognitiveSessions.tenantId, tenantId))
    .limit(1000);

  const totalSessions = sessions.length;
  const fastPathCount = sessions.filter((s) => s.threadCount === 1).length;
  const deepPathCount = sessions.filter((s) => (s.threadCount || 0) > 1).length;

  const averageConfidence =
    totalSessions > 0
      ? sessions.reduce((sum, s) => sum + (s.confidence || 0), 0) / totalSessions
      : 0;

  // Calculate latency from startedAt to completedAt
  const latencies = sessions
    .filter((s) => s.completedAt)
    .map((s) => {
      const start = new Date(s.startedAt).getTime();
      const end = new Date(s.completedAt!).getTime();
      return end - start;
    });

  const averageLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0;

  return {
    totalSessions,
    fastPathCount,
    deepPathCount,
    averageConfidence,
    averageLatency,
  };
}

/**
 * Adaptive threshold adjustment based on performance
 */
export function adjustThresholds(
  currentAmbiguityThreshold: number,
  currentImpactThreshold: number,
  stats: {
    fastPathAccuracy: number;
    deepPathAccuracy: number;
    fastPathLatency: number;
    deepPathLatency: number;
  }
): { ambiguityThreshold: number; impactThreshold: number } {
  let ambiguityThreshold = currentAmbiguityThreshold;
  let impactThreshold = currentImpactThreshold;

  // If fast path is performing well, increase thresholds (use fast path more)
  if (stats.fastPathAccuracy > 0.85 && stats.fastPathLatency < 1000) {
    ambiguityThreshold = Math.min(0.7, currentAmbiguityThreshold + 0.05);
    impactThreshold = Math.min(0.8, currentImpactThreshold + 0.05);
  }

  // If deep path is performing much better, decrease thresholds (use deep path more)
  if (stats.deepPathAccuracy - stats.fastPathAccuracy > 0.2) {
    ambiguityThreshold = Math.max(0.3, currentAmbiguityThreshold - 0.05);
    impactThreshold = Math.max(0.4, currentImpactThreshold - 0.05);
  }

  return { ambiguityThreshold, impactThreshold };
}

/**
 * Orchestrator health check
 */
export async function healthCheck(tenantId: number): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  fastPathAvailable: boolean;
  deepPathAvailable: boolean;
  lastSessionTime?: Date;
  message: string;
}> {
  const db = await getDb();

  if (!db) {
    return {
      status: "degraded",
      fastPathAvailable: true,
      deepPathAvailable: false,
      message: "Database unavailable - using fallback mode",
    };
  }

  try {
    const recentSessions = await db
      .select()
      .from(cognitiveSessions)
      .where(eq(cognitiveSessions.tenantId, tenantId))
      .limit(1);

    const lastSessionTime = recentSessions.length > 0 ? recentSessions[0].startedAt : undefined;

    return {
      status: "healthy",
      fastPathAvailable: true,
      deepPathAvailable: true,
      lastSessionTime,
      message: "Orchestrator operational",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      fastPathAvailable: false,
      deepPathAvailable: false,
      message: `Orchestrator error: ${error}`,
    };
  }
}
