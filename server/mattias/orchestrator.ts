import { invokeLLM, Message } from "../_core/llm";
import { getDb } from "../db";
import {
  approvals,
  events,
  memoryEmbeddings,
  policies,
} from "../../drizzle/schema";
import { and, desc, eq, like } from "drizzle-orm";
import {
  AGENT_EVENT_MAP,
  AGENT_NAMES,
  AgentName,
  AUTONOMY_LEVELS,
  AutonomyLevel,
  EventType,
  SemanticEvent,
} from "./eventCatalog";
import { nanoid } from "nanoid";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentInput {
  event: SemanticEvent;
  context: Record<string, unknown>;
  pastMemory?: MemoryRecord[];
}

export interface DesiredAction {
  actionType: string;
  payload: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface AgentThoughtOutput {
  decision: string;
  reasoning: string;
  confidence: number;
  desiredActions: DesiredAction[];
  summary?: string;
}

export interface AgentOpinion extends AgentThoughtOutput {
  agentName: string;
}

export interface DebateResult {
  opinions: AgentOpinion[];
  critique: CritiqueResult;
  finalDecision: AgentThoughtOutput;
  agentsInvolved: string[];
}

export interface CritiqueResult {
  bestAgent: string;
  issues: string[];
  improvedDecision: string;
  improvedReasoning: string;
  finalActions: DesiredAction[];
}

export interface MemoryRecord {
  id: number;
  content: string;
  metadata: Record<string, unknown> | null;
  score?: number;
  createdAt: Date;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildAgentPrompt(params: {
  agentName: string;
  role: string;
  goal: string;
  event: SemanticEvent;
  context: Record<string, unknown>;
  pastMemory: MemoryRecord[];
}): string {
  const memorySection =
    params.pastMemory.length > 0
      ? params.pastMemory
          .slice(0, 5)
          .map((m) => `- ${m.content}`)
          .join("\n")
      : "No relevant past memory found.";

  return `You are ${params.agentName}, an AI agent in the MATTIAS operating system.

ROLE: ${params.role}
GOAL: ${params.goal}

CURRENT BUSINESS EVENT:
Type: ${params.event.eventType}
Aggregate: ${params.event.aggregateType} (ID: ${params.event.aggregateId})
Data: ${JSON.stringify(params.event.data, null, 2)}
Source: ${params.event.metadata.source ?? "unknown"}

RELEVANT PAST MEMORY:
${memorySection}

CONTEXT:
${JSON.stringify(params.context, null, 2)}

INSTRUCTIONS:
- Think step by step about this business event
- Decide the best course of action
- Be specific and actionable
- Consider risk before recommending high-stakes actions
- Return ONLY valid JSON matching the output format

OUTPUT FORMAT (strict JSON):
{
  "decision": "One sentence summary of your decision",
  "reasoning": "Detailed reasoning for this decision",
  "confidence": 0.85,
  "summary": "Brief human-readable summary",
  "desiredActions": [
    {
      "actionType": "SEND_MESSAGE",
      "payload": { "to": "...", "message": "..." },
      "requiresApproval": false
    }
  ]
}`;
}

function buildCriticPrompt(opinions: AgentOpinion[]): string {
  return `You are CriticAgent in the MATTIAS operating system.
Your role is to critically review decisions from multiple specialized agents and produce an improved, synthesized decision.

AGENT OPINIONS:
${JSON.stringify(opinions, null, 2)}

INSTRUCTIONS:
- Identify the strongest reasoning
- Flag any risks or gaps in the individual opinions
- Produce an improved, synthesized decision that combines the best elements
- Return ONLY valid JSON

OUTPUT FORMAT (strict JSON):
{
  "bestAgent": "AgentName",
  "issues": ["Issue 1", "Issue 2"],
  "improvedDecision": "Synthesized decision statement",
  "improvedReasoning": "Why this is better than individual opinions",
  "finalActions": [
    {
      "actionType": "ACTION_TYPE",
      "payload": {},
      "requiresApproval": false
    }
  ]
}`;
}

// ─── Agent Definitions ────────────────────────────────────────────────────────

const AGENT_DEFINITIONS: Record<
  string,
  { role: string; goal: string; handledEvents: string[] }
> = {
  [AGENT_NAMES.SALES]: {
    role: "Senior Sales Strategist",
    goal: "Convert leads, prioritize deals, and maximize revenue",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.SALES],
  },
  [AGENT_NAMES.FINANCE]: {
    role: "Chief Financial Analyst",
    goal: "Protect cash flow, enforce budgets, and flag financial risks",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.FINANCE],
  },
  [AGENT_NAMES.OPERATIONS]: {
    role: "Operations Director",
    goal: "Ensure smooth execution of tasks, workflows, and SOPs",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.OPERATIONS],
  },
  [AGENT_NAMES.MARKETING]: {
    role: "Growth Marketing Strategist",
    goal: "Optimize campaigns, track performance, and drive growth",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.MARKETING],
  },
  [AGENT_NAMES.KNOWLEDGE]: {
    role: "Knowledge Architect",
    goal: "Organize, connect, and surface relevant knowledge and insights",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.KNOWLEDGE],
  },
  [AGENT_NAMES.PERSONAL_LIFE]: {
    role: "Personal Life Coach",
    goal: "Optimize health, habits, goals, and schedule",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.PERSONAL_LIFE],
  },
  [AGENT_NAMES.COMMUNICATION]: {
    role: "Communication Manager",
    goal: "Handle messages, emails, and communication workflows efficiently",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.COMMUNICATION],
  },
  [AGENT_NAMES.COMPLIANCE_RISK]: {
    role: "Compliance & Risk Officer",
    goal: "Flag legal risks, track obligations, and ensure compliance",
    handledEvents: AGENT_EVENT_MAP[AGENT_NAMES.COMPLIANCE_RISK],
  },
};

// ─── Memory Service ───────────────────────────────────────────────────────────

function simpleEmbedding(text: string): number[] {
  // Deterministic pseudo-embedding based on character codes
  // In production, replace with real OpenAI embeddings
  const normalized = text.toLowerCase().slice(0, 256);
  const vec: number[] = new Array(64).fill(0);
  for (let i = 0; i < normalized.length; i++) {
    vec[i % 64] += normalized.charCodeAt(i) / 1000;
  }
  return vec;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (magA * magB || 1);
}

export async function storeMemory(
  tenantId: number,
  content: string,
  metadata: Record<string, unknown>,
  eventId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const embedding = simpleEmbedding(content);
  await db.insert(memoryEmbeddings).values({
    tenantId,
    content,
    embedding: embedding as unknown as null,
    metadata: metadata as unknown as null,
    eventId: eventId ?? null,
  });
}

export async function searchMemory(
  tenantId: number,
  query: string,
  topK = 5
): Promise<MemoryRecord[]> {
  const db = await getDb();
  if (!db) return [];
  const queryVec = simpleEmbedding(query);
  const rows = await db
    .select()
    .from(memoryEmbeddings)
    .where(eq(memoryEmbeddings.tenantId, tenantId))
    .orderBy(desc(memoryEmbeddings.createdAt))
    .limit(50);

  const scored = rows.map((row) => {
    const emb = (row.embedding as unknown as number[]) ?? [];
    const score = cosineSimilarity(queryVec, emb);
    return {
      id: row.id,
      content: row.content,
      metadata: row.metadata as Record<string, unknown> | null,
      score,
      createdAt: row.createdAt,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

// ─── Risk Engine ──────────────────────────────────────────────────────────────

export function assessRisk(
  eventType: string,
  action: DesiredAction
): number {
  let risk = 0;

  // Financial events carry higher base risk
  if (
    eventType.startsWith("Payment") ||
    eventType.startsWith("Invoice") ||
    eventType.startsWith("Cashflow")
  ) {
    risk += 0.4;
  }

  // High-risk action types
  const highRiskActions = ["DELETE_DATA", "EXECUTE_PAYMENT", "SEND_MONEY"];
  const mediumRiskActions = ["SEND_MESSAGE", "CREATE_TASK", "SCHEDULE_CALL"];

  if (highRiskActions.includes(action.actionType)) risk += 0.5;
  if (mediumRiskActions.includes(action.actionType)) risk += 0.15;

  // Amount-based risk
  const amount = (action.payload?.amount as number) ?? 0;
  if (amount > 50000) risk += 0.4;
  else if (amount > 10000) risk += 0.25;
  else if (amount > 1000) risk += 0.1;

  // External communication risk
  if (action.actionType.startsWith("SEND_")) risk += 0.1;

  return Math.min(risk, 1);
}

// ─── Policy Engine ────────────────────────────────────────────────────────────

type PolicyEffect = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

interface PolicyRecord {
  name: string;
  eventConditions: Record<string, unknown>;
  actionConditions: Record<string, unknown> | null;
  effect: PolicyEffect;
  precedence: number;
}

function matchesCondition(
  conditions: Record<string, unknown>,
  target: Record<string, unknown>
): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (key === "eventType" || key === "actionType") {
      if (value !== "*" && target[key] !== value) return false;
    } else if (typeof value === "object" && value !== null) {
      const op = value as Record<string, unknown>;
      const targetVal = target[key] as number;
      if (op["$gt"] !== undefined && !(targetVal > (op["$gt"] as number)))
        return false;
      if (op["$lt"] !== undefined && !(targetVal < (op["$lt"] as number)))
        return false;
      if (op["$gte"] !== undefined && !(targetVal >= (op["$gte"] as number)))
        return false;
    } else {
      if (target[key] !== value) return false;
    }
  }
  return true;
}

export async function evaluatePolicy(
  tenantId: number,
  eventType: string,
  action: DesiredAction
): Promise<PolicyEffect> {
  const db = await getDb();
  if (!db) return "ALLOW";

  const rows = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, tenantId), eq(policies.enabled, true)));

  const sorted = rows.sort(
    (a, b) => (b.precedence ?? 0) - (a.precedence ?? 0)
  );

  for (const policy of sorted) {
    const eventConds = policy.eventConditions as Record<string, unknown>;
    const actionConds = policy.actionConditions as Record<
      string,
      unknown
    > | null;

    const eventMatch = matchesCondition(eventConds, {
      eventType,
      ...({} as Record<string, unknown>),
    });
    const actionMatch = actionConds
      ? matchesCondition(actionConds, { actionType: action.actionType })
      : true;

    if (eventMatch && actionMatch) {
      return policy.effect as PolicyEffect;
    }
  }

  return "ALLOW";
}

// ─── Single Agent Execution ───────────────────────────────────────────────────

export async function runAgent(
  agentName: string,
  input: AgentInput
): Promise<AgentThoughtOutput> {
  const def = AGENT_DEFINITIONS[agentName];
  if (!def) {
    return {
      decision: "No agent definition found",
      reasoning: `Agent ${agentName} is not configured`,
      confidence: 0,
      desiredActions: [],
    };
  }

  const prompt = buildAgentPrompt({
    agentName,
    role: def.role,
    goal: def.goal,
    event: input.event,
    context: input.context,
    pastMemory: input.pastMemory ?? [],
  });

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an AI agent in the MATTIAS operating system. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agent_output",
          strict: true,
          schema: {
            type: "object",
            properties: {
              decision: { type: "string" },
              reasoning: { type: "string" },
              confidence: { type: "number" },
              summary: { type: "string" },
              desiredActions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    actionType: { type: "string" },
                    payload: { type: "object", additionalProperties: true },
                    requiresApproval: { type: "boolean" },
                  },
                  required: ["actionType", "payload"],
                  additionalProperties: false,
                },
              },
            },
            required: [
              "decision",
              "reasoning",
              "confidence",
              "desiredActions",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const parsed = JSON.parse(content) as AgentThoughtOutput;
    return {
      decision: parsed.decision ?? "No decision",
      reasoning: parsed.reasoning ?? "",
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
      desiredActions: parsed.desiredActions ?? [],
      summary: parsed.summary,
    };
  } catch (err) {
    console.error(`[MATTIAS] Agent ${agentName} failed:`, err);
    return {
      decision: "Agent reasoning failed — falling back to safe mode",
      reasoning: String(err),
      confidence: 0.1,
      desiredActions: [],
    };
  }
}

// ─── CriticAgent ──────────────────────────────────────────────────────────────

export async function runCriticAgent(
  opinions: AgentOpinion[]
): Promise<CritiqueResult> {
  const prompt = buildCriticPrompt(opinions);

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are CriticAgent in the MATTIAS operating system. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "critic_output",
          strict: true,
          schema: {
            type: "object",
            properties: {
              bestAgent: { type: "string" },
              issues: { type: "array", items: { type: "string" } },
              improvedDecision: { type: "string" },
              improvedReasoning: { type: "string" },
              finalActions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    actionType: { type: "string" },
                    payload: { type: "object", additionalProperties: true },
                    requiresApproval: { type: "boolean" },
                  },
                  required: ["actionType", "payload"],
                  additionalProperties: false,
                },
              },
            },
            required: [
              "bestAgent",
              "issues",
              "improvedDecision",
              "improvedReasoning",
              "finalActions",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent2 = response.choices[0]?.message?.content ?? "{}";
    const content2 = typeof rawContent2 === "string" ? rawContent2 : "{}";
    return JSON.parse(content2) as CritiqueResult;
  } catch (err) {
    console.error("[MATTIAS] CriticAgent failed:", err);
    // Fall back to highest-confidence opinion
    const best = opinions.sort((a, b) => b.confidence - a.confidence)[0];
    return {
      bestAgent: best?.agentName ?? "Unknown",
      issues: ["CriticAgent failed to produce critique"],
      improvedDecision: best?.decision ?? "No decision",
      improvedReasoning: best?.reasoning ?? "",
      finalActions: best?.desiredActions ?? [],
    };
  }
}

// ─── Multi-Agent Debate ───────────────────────────────────────────────────────

export async function runDebate(
  tenantId: number,
  event: SemanticEvent,
  agentNames: string[],
  context: Record<string, unknown>
): Promise<DebateResult> {
  const memoryQuery = `${event.eventType} ${event.aggregateType} ${JSON.stringify(event.data).slice(0, 100)}`;
  const pastMemory = await searchMemory(tenantId, memoryQuery, 5);

  const input: AgentInput = { event, context, pastMemory };

  // Collect opinions from all relevant agents
  const opinions: AgentOpinion[] = [];
  for (const agentName of agentNames) {
    const thought = await runAgent(agentName, input);
    opinions.push({ ...thought, agentName });
  }

  // Run CriticAgent
  const critique = await runCriticAgent(opinions);

  const finalDecision: AgentThoughtOutput = {
    decision: critique.improvedDecision,
    reasoning: critique.improvedReasoning,
    confidence: Math.max(...opinions.map((o) => o.confidence)),
    desiredActions: critique.finalActions,
  };

  return {
    opinions,
    critique,
    finalDecision,
    agentsInvolved: [...agentNames, AGENT_NAMES.CRITIC],
  };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export interface OrchestratorResult {
  eventId: number;
  agentsInvolved: string[];
  finalDecision: AgentThoughtOutput;
  actionsQueued: number;
  actionsExecuted: number;
  approvalsCreated: number;
  correlationId: string;
}

export async function orchestrateEvent(params: {
  tenantId: number;
  userId?: number;
  event: Omit<SemanticEvent, "metadata"> & { metadata?: Partial<SemanticEvent["metadata"]> };
  autonomyLevel: AutonomyLevel;
  enableDebate?: boolean;
}): Promise<OrchestratorResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const correlationId = params.event.metadata?.correlationId ?? nanoid(12);

  const fullEvent: SemanticEvent = {
    ...params.event,
    metadata: {
      tenantId: params.tenantId,
      userId: params.userId,
      correlationId,
      source: params.event.metadata?.source ?? "user",
      ...params.event.metadata,
    },
  };

  // Store event in database
  const [insertResult] = await db.insert(events).values({
    tenantId: params.tenantId,
    eventType: fullEvent.eventType,
    aggregateId: fullEvent.aggregateId,
    aggregateType: fullEvent.aggregateType,
    occurrenceTime: new Date(fullEvent.occurredAt),
    data: fullEvent.data as unknown as null,
    correlationId,
    source: fullEvent.metadata.source,
    causationId: fullEvent.metadata.causationId ?? null,
  });

  const eventId = (insertResult as unknown as { insertId: number }).insertId;

  // Find relevant agents
  const relevantAgents = Object.entries(AGENT_EVENT_MAP)
    .filter(([, evts]) => evts.includes(fullEvent.eventType))
    .map(([agentName]) => agentName);

  if (relevantAgents.length === 0) {
    return {
      eventId,
      agentsInvolved: [],
      finalDecision: {
        decision: "No agents handle this event type",
        reasoning: "Event type not mapped to any agent",
        confidence: 0,
        desiredActions: [],
      },
      actionsQueued: 0,
      actionsExecuted: 0,
      approvalsCreated: 0,
      correlationId,
    };
  }

  // Run agents (debate if multiple + enabled, else single)
  let finalDecision: AgentThoughtOutput;
  let agentsInvolved: string[];

  const context = { autonomyLevel: params.autonomyLevel, tenantId: params.tenantId };

  if (params.enableDebate && relevantAgents.length > 1) {
    const debate = await runDebate(
      params.tenantId,
      fullEvent,
      relevantAgents,
      context
    );
    finalDecision = debate.finalDecision;
    agentsInvolved = debate.agentsInvolved;
  } else {
    const thought = await runAgent(relevantAgents[0]!, {
      event: fullEvent,
      context,
      pastMemory: await searchMemory(
        params.tenantId,
        `${fullEvent.eventType} ${JSON.stringify(fullEvent.data).slice(0, 100)}`,
        5
      ),
    });
    finalDecision = thought;
    agentsInvolved = [relevantAgents[0]!];
  }

  // Store memory of this event + decision
  await storeMemory(
    params.tenantId,
    `${fullEvent.eventType} for ${fullEvent.aggregateType} ${fullEvent.aggregateId}: ${finalDecision.decision}`,
    {
      eventType: fullEvent.eventType,
      aggregateType: fullEvent.aggregateType,
      decision: finalDecision.decision,
      agents: agentsInvolved,
    },
    eventId
  );

  // Process actions through autonomy controller
  let actionsExecuted = 0;
  let approvalsCreated = 0;

  for (const action of finalDecision.desiredActions) {
    const risk = assessRisk(fullEvent.eventType, action);
    const policyEffect = await evaluatePolicy(
      params.tenantId,
      fullEvent.eventType,
      action
    );

    const shouldQueue =
      policyEffect === "REQUIRE_APPROVAL" ||
      policyEffect === "DENY" ||
      params.autonomyLevel === AUTONOMY_LEVELS.MANUAL ||
      (params.autonomyLevel === AUTONOMY_LEVELS.ASSISTED && risk > 0.5) ||
      (params.autonomyLevel === AUTONOMY_LEVELS.APPROVAL_GUARDED && risk > 0.3) ||
      action.requiresApproval;

    if (policyEffect === "DENY") {
      // Log denial but don't queue
      continue;
    }

    if (shouldQueue) {
      await db.insert(approvals).values({
        tenantId: params.tenantId,
        eventType: fullEvent.eventType,
        eventData: fullEvent.data as unknown as null,
        agentName: agentsInvolved[0] ?? "Unknown",
        agentReasoning: finalDecision.reasoning,
        actionType: action.actionType,
        actionPayload: action.payload as unknown as null,
        requestedBy: params.userId ?? null,
        riskScore: risk,
        status: "PENDING",
        correlationId,
      });
      approvalsCreated++;
    } else {
      // Autonomous execution — log as executed action event
      await db.insert(events).values({
        tenantId: params.tenantId,
        eventType: "ActionExecuted",
        aggregateId: fullEvent.aggregateId,
        aggregateType: "Action",
        data: { actionType: action.actionType, payload: action.payload } as unknown as null,
        correlationId,
        causationId: eventId,
        source: "agent",
      });
      actionsExecuted++;
    }
  }

  return {
    eventId,
    agentsInvolved,
    finalDecision,
    actionsQueued: finalDecision.desiredActions.length,
    actionsExecuted,
    approvalsCreated,
    correlationId,
  };
}

// ─── MATTIAS Command Interface ────────────────────────────────────────────────

export async function runMATTIASCommand(params: {
  tenantId: number;
  userId?: number;
  command: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<{ response: string; agentsInvolved: string[] }> {
  const recentMemory = await searchMemory(params.tenantId, params.command, 3);
  const memoryContext =
    recentMemory.length > 0
      ? `\nRELEVANT MEMORY:\n${recentMemory.map((m) => `- ${m.content}`).join("\n")}`
      : "";

  const systemPrompt = `You are MATTIAS — an AI Operating System for life, business, and execution.
You are the central intelligence that coordinates 8 specialized agents:
- OperationsAgent: task management, workflows, SOPs
- FinanceAgent: cash flow, budgets, expenses
- SalesAgent: leads, deals, CRM
- MarketingAgent: campaigns, ads, content
- KnowledgeAgent: information storage and recall
- PersonalLifeAgent: health, habits, goals
- CommunicationAgent: emails, messages, calls
- ComplianceRiskAgent: legal, compliance, risk

You have persistent memory of past events and decisions.
You can reason about the user's business context, suggest actions, and coordinate agents.
Be direct, intelligent, and strategic. Reference relevant memory when applicable.
${memoryContext}

When the user asks you to trigger an event or take an action, respond with what you would do and which agent would handle it.`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...params.history.slice(-10).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: params.command },
  ];

  const response = await invokeLLM({ messages });
  const rawContent = response.choices[0]?.message?.content ?? "I'm unable to process that command right now.";
  const content = typeof rawContent === "string" ? rawContent : "I'm unable to process that command right now.";

  // Determine which agents were mentioned
  const agentsInvolved = Object.values(AGENT_NAMES).filter((name) =>
    content.includes(name)
  );

  return { response: content, agentsInvolved };
}
