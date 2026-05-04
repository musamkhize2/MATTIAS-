import { v4 as uuidv4 } from "uuid";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  cognitiveSessions,
  thoughtNodes as thoughtNodesTable,
  cognitiveMemory,
  uncertaintyFlags,
  identityProfiles,
  cognitiveBudgets,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Cognitive Field Engine (CFE)
 * Multi-threaded parallel reasoning with budgeting and cost controls
 */

export interface CognitiveBudget {
  maxThreads: number;
  maxRounds: number;
  maxTotalTokens: number;
  maxLatencyMs: number;
}

export interface IdentityProfile {
  thinkingStyle: "strategic_balanced" | "creative_exploratory" | "analytical_rigorous" | "pragmatic_direct";
  riskTolerance: number;
  creativityBias: number;
  communicationStyle: "direct_warm" | "formal_precise" | "casual_friendly" | "executive_concise";
  decisionConfidenceProfile: "progressive" | "conservative" | "balanced";
}

export interface ThoughtNodeOutput {
  id: string;
  thread: string;
  content: string;
  confidence: number;
  relevance: number;
  emotionalValence?: string;
  suggestedActions?: any[];
  challenges?: string[];
}

export interface CFESessionInput {
  tenantId: number;
  userId: number;
  eventId?: number;
  mode: "focus" | "creative" | "crisis" | "exploratory";
  complexity: "low" | "medium" | "high";
  userQuery: string;
  context?: Record<string, any>;
}

export interface CFESessionOutput {
  sessionId: string;
  finalOutput: string;
  confidence: number;
  suggestedActions: any[];
  thoughtProcess: ThoughtNodeOutput[];
  tokensUsed: number;
  uncertaintyFlags?: any[];
}

/**
 * Determine if CFE should be triggered based on complexity
 */
export async function shouldTriggerCFE(
  tenantId: number,
  complexity: "low" | "medium" | "high",
  ambiguity: number, // 0-1
  decisionImpact: number // 0-1
): Promise<boolean> {
  // Thresholds for CFE activation
  const ambiguityThreshold = 0.5;
  const impactThreshold = 0.6;

  // Always trigger for high complexity or high impact
  if (complexity === "high" || decisionImpact > impactThreshold) {
    return true;
  }

  // Trigger if ambiguity is high
  if (ambiguity > ambiguityThreshold) {
    return true;
  }

  // Otherwise, use fast path
  return false;
}

/**
 * Get cognitive budget for tenant
 */
export async function getCognitiveBudget(tenantId: number, tier: string): Promise<CognitiveBudget> {
  const db = await getDb();
  if (!db) {
    return {
      maxThreads: 2,
      maxRounds: 1,
      maxTotalTokens: 4000,
      maxLatencyMs: 2000,
    };
  }

  const result = await db
    .select()
    .from(cognitiveBudgets)
    .where(and(eq(cognitiveBudgets.tenantId, tenantId), eq(cognitiveBudgets.subscriptionTier, tier as any)))
    .limit(1);

  if (result.length > 0) {
    const budget = result[0];
    return {
      maxThreads: budget.maxThreads || 2,
      maxRounds: budget.maxRounds || 1,
      maxTotalTokens: budget.maxTotalTokens || 4000,
      maxLatencyMs: budget.maxLatencyMs || 2000,
    };
  }

  // Default budget
  return {
    maxThreads: 2,
    maxRounds: 1,
    maxTotalTokens: 4000,
    maxLatencyMs: 2000,
  };
}

/**
 * Get identity profile for tenant
 */
export async function getIdentityProfile(tenantId: number): Promise<IdentityProfile> {
  const db = await getDb();
  if (!db) {
    return {
      thinkingStyle: "strategic_balanced",
      riskTolerance: 0.6,
      creativityBias: 0.5,
      communicationStyle: "direct_warm",
      decisionConfidenceProfile: "balanced",
    };
  }

  const result = await db
    .select()
    .from(identityProfiles)
    .where(eq(identityProfiles.tenantId, tenantId))
    .limit(1);

  if (result.length > 0) {
    const profile = result[0];
    return {
      thinkingStyle: profile.thinkingStyle as any,
      riskTolerance: profile.riskTolerance || 0.6,
      creativityBias: profile.creativityBias || 0.5,
      communicationStyle: profile.communicationStyle as any,
      decisionConfidenceProfile: profile.decisionConfidenceProfile as any,
    };
  }

  // Default profile
  return {
    thinkingStyle: "strategic_balanced",
    riskTolerance: 0.6,
    creativityBias: 0.5,
    communicationStyle: "direct_warm",
    decisionConfidenceProfile: "balanced",
  };
}

/**
 * Spawn cognitive threads and collect thought nodes
 */
export async function spawnCognitiveThreads(
  sessionId: string,
  tenantId: number,
  userQuery: string,
  identity: IdentityProfile,
  budget: CognitiveBudget,
  context?: Record<string, any>
): Promise<ThoughtNodeOutput[]> {
  const threads: string[] = ["logical", "intuitive", "contrarian", "memory", "creative", "ethical"];
  const activeThreads = threads.slice(0, Math.min(budget.maxThreads, threads.length));

  const thoughtNodes: ThoughtNodeOutput[] = [];

  for (const thread of activeThreads) {
    const threadPrompt = buildThreadPrompt(thread, userQuery, identity, context);

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a ${thread} reasoning thread in a cognitive field engine. Provide your perspective on the given query. Be concise but thorough.`,
          },
          {
            role: "user",
            content: threadPrompt,
          },
        ],
      });

      const content = typeof response.choices[0]?.message?.content === "string" ? response.choices[0].message.content : "";

      const node: ThoughtNodeOutput = {
        id: uuidv4(),
        thread,
        content,
        confidence: Math.random() * 0.5 + 0.5, // 0.5-1.0
        relevance: Math.random() * 0.5 + 0.5,
        emotionalValence: thread === "creative" ? "positive" : undefined,
        suggestedActions: [],
        challenges: [],
      };

      thoughtNodes.push(node);

      // Save thought node to database
      const db = await getDb();
      if (db) {
        await db.insert(thoughtNodesTable).values({
          id: node.id,
          sessionId,
          tenantId,
          threadType: thread as any,
          content: node.content,
          confidence: node.confidence,
          relevance: node.relevance,
          emotionalValence: node.emotionalValence,
          suggestedActions: JSON.stringify(node.suggestedActions),
          challenges: JSON.stringify(node.challenges),
        });
      }
    } catch (error) {
      console.error(`Error in ${thread} thread:`, error);
    }
  }

  return thoughtNodes;
}

/**
 * Build thread-specific prompt
 */
function buildThreadPrompt(
  thread: string,
  userQuery: string,
  identity: IdentityProfile,
  context?: Record<string, any>
): string {
  const contextStr = context ? JSON.stringify(context) : "";

  switch (thread) {
    case "logical":
      return `Analyze this query using rigorous logical reasoning: "${userQuery}". Consider facts, evidence, and deductive reasoning. ${contextStr}`;

    case "intuitive":
      return `Use pattern recognition and intuitive insights to address: "${userQuery}". Draw on similar past situations. ${contextStr}`;

    case "contrarian":
      return `Challenge the conventional wisdom on: "${userQuery}". What could we be missing? What if the opposite were true? ${contextStr}`;

    case "memory":
      return `Based on past experiences and memories, how should we approach: "${userQuery}"? What patterns do you see? ${contextStr}`;

    case "creative":
      return `Generate creative, unconventional solutions for: "${userQuery}". Think outside the box. ${contextStr}`;

    case "ethical":
      return `Consider the ethical implications and stakeholder impact of: "${userQuery}". What's the right thing to do? ${contextStr}`;

    default:
      return userQuery;
  }
}

/**
 * Synthesize thought nodes into final output
 */
export async function synthesizeThoughts(
  sessionId: string,
  tenantId: number,
  userQuery: string,
  nodes: ThoughtNodeOutput[], identity: IdentityProfile
): Promise<{ output: string; confidence: number; suggestedActions: any[] }> {
  const synthesisPrompt = `
You are synthesizing insights from multiple cognitive threads to provide a final recommendation.

User Query: "${userQuery}"

Thread Insights:
${nodes.map((node: any) => `- ${node.thread.toUpperCase()}: ${node.content}`).join("\n")}

Identity Profile:
- Thinking Style: ${identity.thinkingStyle}
- Risk Tolerance: ${identity.riskTolerance}
- Communication Style: ${identity.communicationStyle}

Please provide:
1. A coherent final recommendation
2. Key insights from the threads
3. Suggested next actions
4. Confidence level (0-1)

Format your response as JSON with keys: recommendation, keyInsights, suggestedActions, confidence
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are the synthesis engine of a cognitive field. Integrate multiple perspectives into a coherent recommendation.",
        },
        {
          role: "user",
          content: synthesisPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "synthesis_output",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendation: { type: "string" },
              keyInsights: { type: "array", items: { type: "string" } },
              suggestedActions: { type: "array", items: { type: "string" } },
              confidence: { type: "number" },
            },
            required: ["recommendation", "keyInsights", "suggestedActions", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

      const content = typeof response.choices[0]?.message?.content === "string" ? response.choices[0].message.content : "{}";
    const parsed = JSON.parse(content);

    return {
      output: parsed.recommendation || "",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      suggestedActions: parsed.suggestedActions || [],
    };
  } catch (error) {
    console.error("Error synthesizing thoughts:", error);
    return {
      output: "Unable to synthesize thoughts at this time.",
      confidence: 0.3,
      suggestedActions: [],
    };
  }
}

/**
 * Main CFE execution
 */
export async function executeCFE(input: CFESessionInput): Promise<CFESessionOutput> {
  const sessionId = uuidv4();
  const startTime = Date.now();

  const db = await getDb();

  try {
    // Create session record
    if (db) {
      await db.insert(cognitiveSessions).values({
        id: sessionId,
        tenantId: input.tenantId,
        userId: input.userId,
        eventId: input.eventId,
        mode: input.mode,
        complexity: input.complexity,
        status: "running",
      });
    }

    // Get identity profile and budget
    const identity = await getIdentityProfile(input.tenantId);
    const budget = await getCognitiveBudget(input.tenantId, "personal"); // TODO: get actual tier

    // Spawn cognitive threads
    const nodes = await spawnCognitiveThreads(
      sessionId,
      input.tenantId,
      input.userQuery,
      identity,
      budget,
      input.context
    );

    // Synthesize thoughts
    const synthesis = await synthesizeThoughts(sessionId, input.tenantId, input.userQuery, nodes, identity);

    // Check for uncertainty
    const uncertaintyThreshold = 0.6;
    const hasUncertainty = synthesis.confidence < uncertaintyThreshold;

    if (hasUncertainty && db) {
      await db.insert(uncertaintyFlags).values({
        id: uuidv4(),
        tenantId: input.tenantId,
        sessionId,
        confidenceScore: synthesis.confidence,
        reason: "Low confidence in synthesis",
        humanReviewRequested: synthesis.confidence < 0.4,
      });
    }

    // Update session with completion
    if (db) {
      await db
        .update(cognitiveSessions)
        .set({
          status: "completed",
          completedAt: new Date(),
          confidence: synthesis.confidence,
          finalOutput: JSON.stringify(synthesis),
          tokensUsed: 0, // TODO: track actual token usage
        })
        .where(eq(cognitiveSessions.id, sessionId));
    }

    const elapsed = Date.now() - startTime;

    return {
      sessionId,
      finalOutput: synthesis.output,
      confidence: synthesis.confidence,
      suggestedActions: synthesis.suggestedActions,
      thoughtProcess: nodes as any,
      tokensUsed: 0,
      uncertaintyFlags: hasUncertainty ? [{ confidence: synthesis.confidence }] : undefined,
    };
  } catch (error) {
    console.error("CFE execution error:", error);

    if (db) {
      await db
        .update(cognitiveSessions)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(cognitiveSessions.id, sessionId))
        .catch(() => {});
    }

    throw error;
  }
}

/**
 * Fast inference path (single LLM call)
 */
export async function fastInferencePath(
  tenantId: number,
  userQuery: string,
  identity: IdentityProfile
): Promise<string> {
  const prompt = `
You are MATTIAS, an AI operating system for business.
Thinking Style: ${identity.thinkingStyle}
Communication Style: ${identity.communicationStyle}

User Query: "${userQuery}"

Provide a quick, direct response.
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are MATTIAS, an AI operating system. Be direct and helpful.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === "string" ? content : "I'm thinking about this...";
  } catch (error) {
    console.error("Fast inference error:", error);
    return "Let me think about that more carefully...";
  }
}
