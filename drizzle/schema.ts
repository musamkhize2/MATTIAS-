import {
  bigint,
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  tenantId: int("tenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tenants ──────────────────────────────────────────────────────────────────
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["personal", "professional", "enterprise"])
    .default("personal")
    .notNull(),
  autonomyLevel: mysqlEnum("autonomyLevel", ["manual", "assisted", "approval_guarded", "autonomous"])
    .default("assisted")
    .notNull(),
  features: json("features"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;

// ─── Semantic Event Store ─────────────────────────────────────────────────────
export const events = mysqlTable("events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  aggregateId: varchar("aggregateId", { length: 128 }).notNull(),
  aggregateType: varchar("aggregateType", { length: 64 }).notNull(),
  occurrenceTime: timestamp("occurrenceTime").defaultNow().notNull(),
  data: json("data").notNull(),
  causationId: bigint("causationId", { mode: "number" }),
  correlationId: varchar("correlationId", { length: 128 }),
  source: varchar("source", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Entity Projections ───────────────────────────────────────────────────────
export const entities = mysqlTable("entities", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  currentState: json("currentState").notNull(),
  version: int("version").default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Entity = typeof entities.$inferSelect;

// ─── Relationships (Knowledge Graph) ─────────────────────────────────────────
export const relationships = mysqlTable("relationships", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  fromEntityId: int("fromEntityId").notNull(),
  toEntityId: int("toEntityId").notNull(),
  relationshipType: varchar("relationshipType", { length: 64 }).notNull(),
  properties: json("properties"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Memory Embeddings ────────────────────────────────────────────────────────
export const memoryEmbeddings = mysqlTable("memory_embeddings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  content: text("content").notNull(),
  eventId: bigint("eventId", { mode: "number" }),
  embedding: json("embedding"), // stored as JSON array of numbers
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemoryEmbedding = typeof memoryEmbeddings.$inferSelect;

// ─── Policies ─────────────────────────────────────────────────────────────────
export const policies = mysqlTable("policies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventConditions: json("eventConditions").notNull(),
  actionConditions: json("actionConditions"),
  effect: mysqlEnum("effect", ["ALLOW", "DENY", "REQUIRE_APPROVAL"]).notNull(),
  precedence: int("precedence").default(0),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;

// ─── Approval Queue ───────────────────────────────────────────────────────────
export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  eventData: json("eventData").notNull(),
  agentName: varchar("agentName", { length: 128 }),
  agentReasoning: text("agentReasoning"),
  actionType: varchar("actionType", { length: 128 }).notNull(),
  actionPayload: json("actionPayload"),
  requestedBy: int("requestedBy"),
  riskScore: float("riskScore"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  correlationId: varchar("correlationId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = typeof approvals.$inferInsert;

// ─── Agent Configurations ─────────────────────────────────────────────────────
export const agentConfigs = mysqlTable("agent_configs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  agentName: varchar("agentName", { length: 128 }).notNull(),
  config: json("config").notNull(),
  enabled: boolean("enabled").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentConfig = typeof agentConfigs.$inferSelect;

// ─── Workflow Definitions ─────────────────────────────────────────────────────
export const workflowDefinitions = mysqlTable("workflow_definitions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  startEventType: varchar("startEventType", { length: 128 }).notNull(),
  definition: json("definition").notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Feature Flags ────────────────────────────────────────────────────────────
export const featureFlags = mysqlTable("feature_flags", {
  id: int("id").autoincrement().primaryKey(),
  featureKey: varchar("featureKey", { length: 128 }).notNull().unique(),
  description: text("description"),
  enabledTiers: json("enabledTiers"),
});

// ─── Command History ──────────────────────────────────────────────────────────
export const commandHistory = mysqlTable("command_history", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId"),
  command: text("command").notNull(),
  response: text("response"),
  agentsInvolved: json("agentsInvolved"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommandHistoryEntry = typeof commandHistory.$inferSelect;
export type InsertCommandHistory = typeof commandHistory.$inferInsert;

// ─── Data Sources ─────────────────────────────────────────────────────────────
export const dataSources = mysqlTable("data_sources", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(), // 'webhook', 'crm', 'api'
  config: json("config").$type<Record<string, unknown>>().notNull(),
  webhookSecret: varchar("webhookSecret", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = typeof dataSources.$inferInsert;

// ─── CRM Connectors ───────────────────────────────────────────────────────────
export const crmConnectors = mysqlTable("crm_connectors", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  crmType: varchar("crmType", { length: 64 }).notNull(), // 'hubspot', 'salesforce', 'pipedrive'
  displayName: varchar("displayName", { length: 255 }).notNull(),
  oauthToken: text("oauthToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  config: json("config").$type<Record<string, unknown>>(),
  eventMappings: json("eventMappings").$type<Record<string, string>>(),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CRMConnector = typeof crmConnectors.$inferSelect;
export type InsertCRMConnector = typeof crmConnectors.$inferInsert;
