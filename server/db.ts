import { and, desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agentConfigs,
  approvals,
  commandHistory,
  entities,
  events,
  featureFlags,
  memoryEmbeddings,
  policies,
  tenants,
  users,
  workflowDefinitions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function getOrCreateDefaultTenant(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Check if user has a tenant
  const userRow = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRow[0]?.tenantId) {
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, userRow[0].tenantId))
      .limit(1);
    if (tenant[0]) return tenant[0];
  }

  // Create default tenant
  const [result] = await db.insert(tenants).values({
    name: "My Workspace",
    subscriptionTier: "professional",
    autonomyLevel: "assisted",
    features: { multi_agent_collab: true, memory: true },
  });
  const tenantId = (result as unknown as { insertId: number }).insertId;

  // Link user to tenant
  await db.update(users).set({ tenantId }).where(eq(users.id, userId));

  // Seed default policies
  await seedDefaultPolicies(tenantId);

  const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return tenant[0]!;
}

async function seedDefaultPolicies(tenantId: number) {
  const db = await getDb();
  if (!db) return;

  const defaultPolicies = [
    {
      tenantId,
      name: "Block data deletion",
      description: "Never allow data deletion autonomously",
      eventConditions: { eventType: "*" },
      actionConditions: { actionType: "DELETE_DATA" },
      effect: "DENY" as const,
      precedence: 999,
      enabled: true,
    },
    {
      tenantId,
      name: "High-value payment approval",
      description: "Require approval for payments over $10,000",
      eventConditions: { eventType: "PaymentApproved" },
      actionConditions: { actionType: "EXECUTE_PAYMENT" },
      effect: "REQUIRE_APPROVAL" as const,
      precedence: 100,
      enabled: true,
    },
    {
      tenantId,
      name: "High-value lead follow-up approval",
      description: "Require approval for high-budget leads",
      eventConditions: { eventType: "LeadCaptured" },
      actionConditions: { actionType: "SEND_MESSAGE" },
      effect: "ALLOW" as const,
      precedence: 50,
      enabled: true,
    },
  ];

  for (const p of defaultPolicies) {
    await db.insert(policies).values({
      ...p,
      eventConditions: p.eventConditions as unknown as null,
      actionConditions: p.actionConditions as unknown as null,
    });
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(tenantId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenantId))
    .orderBy(desc(events.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getEventsByType(tenantId: number, eventType: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(events)
    .where(and(eq(events.tenantId, tenantId), eq(events.eventType, eventType)))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export async function getPendingApprovals(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(approvals)
    .where(and(eq(approvals.tenantId, tenantId), eq(approvals.status, "PENDING")))
    .orderBy(desc(approvals.createdAt));
}

export async function getAllApprovals(tenantId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.tenantId, tenantId))
    .orderBy(desc(approvals.createdAt))
    .limit(limit);
}

export async function resolveApproval(
  id: number,
  tenantId: number,
  status: "APPROVED" | "REJECTED"
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(approvals)
    .set({ status, resolvedAt: new Date() })
    .where(and(eq(approvals.id, id), eq(approvals.tenantId, tenantId)));
}

// ─── Policies ─────────────────────────────────────────────────────────────────

export async function getPolicies(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(policies).where(eq(policies.tenantId, tenantId));
}

export async function createPolicy(data: {
  tenantId: number;
  name: string;
  description?: string;
  eventConditions: Record<string, unknown>;
  actionConditions?: Record<string, unknown>;
  effect: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  precedence?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(policies).values({
    ...data,
    eventConditions: data.eventConditions as unknown as null,
    actionConditions: (data.actionConditions ?? null) as unknown as null,
    precedence: data.precedence ?? 0,
    enabled: true,
  });
  return (result as unknown as { insertId: number }).insertId;
}

export async function togglePolicy(id: number, tenantId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(policies)
    .set({ enabled })
    .where(and(eq(policies.id, id), eq(policies.tenantId, tenantId)));
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export async function getMemoryEntries(tenantId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(memoryEmbeddings)
    .where(eq(memoryEmbeddings.tenantId, tenantId))
    .orderBy(desc(memoryEmbeddings.createdAt))
    .limit(limit);
}

// ─── Agent Configs ────────────────────────────────────────────────────────────

export async function getAgentConfigs(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentConfigs).where(eq(agentConfigs.tenantId, tenantId));
}

export async function upsertAgentConfig(
  tenantId: number,
  agentName: string,
  config: Record<string, unknown>,
  enabled: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .insert(agentConfigs)
    .values({
      tenantId,
      agentName,
      config: config as unknown as null,
      enabled,
    })
    .onDuplicateKeyUpdate({ set: { config: config as unknown as null, enabled } });
}

// ─── Command History ──────────────────────────────────────────────────────────

export async function saveCommandHistory(data: {
  tenantId: number;
  userId?: number;
  command: string;
  response: string;
  agentsInvolved?: string[];
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(commandHistory).values({
    tenantId: data.tenantId,
    userId: data.userId ?? null,
    command: data.command,
    response: data.response,
    agentsInvolved: (data.agentsInvolved ?? []) as unknown as null,
  });
}

export async function getCommandHistory(tenantId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commandHistory)
    .where(eq(commandHistory.tenantId, tenantId))
    .orderBy(desc(commandHistory.createdAt))
    .limit(limit);
}

// ─── Tenant Settings ──────────────────────────────────────────────────────────

export async function updateTenantAutonomy(
  tenantId: number,
  autonomyLevel: "manual" | "assisted" | "approval_guarded" | "autonomous"
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tenants).set({ autonomyLevel }).where(eq(tenants.id, tenantId));
}

export async function updateTenantTier(
  tenantId: number,
  tier: "personal" | "professional" | "enterprise"
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tenants).set({ subscriptionTier: tier }).where(eq(tenants.id, tenantId));
}
