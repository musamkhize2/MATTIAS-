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
import { sql } from "drizzle-orm";

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


// ─── Business Profiles ────────────────────────────────────────────────────────
export const businessProfiles = mysqlTable("business_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: int("tenantId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  
  // Identity
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legalName", { length: 255 }),
  description: text("description"),
  industry: varchar("industry", { length: 128 }),
  businessActivities: json("businessActivities").$type<string[]>(),
  
  // Online Presence
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  logoUrl: varchar("logoUrl", { length: 512 }),
  
  // Financial & Sales Targets
  annualRevenueTarget: float("annualRevenueTarget"),
  monthlyRevenueTarget: float("monthlyRevenueTarget"),
  avgDealSize: float("avgDealSize"),
  avgUnitPrice: float("avgUnitPrice"),
  targetMarginPercent: float("targetMarginPercent"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Time & Language
  operationalHours: json("operationalHours").$type<{
    start: string;
    end: string;
    timezone: string;
  }>(),
  defaultLanguage: varchar("defaultLanguage", { length: 10 }).default("en"),
  
  // MATTIAS AI Config
  aiConfig: json("aiConfig").$type<{
    riskTolerance: "low" | "moderate" | "high";
    communicationTone: "professional" | "casual" | "formal";
  }>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

// ─── Integration Credentials ──────────────────────────────────────────────────
export const integrationCredentials = mysqlTable("integration_credentials", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: int("tenantId").notNull(),
  businessProfileId: varchar("businessProfileId", { length: 36 }),
  
  integrationType: varchar("integrationType", { length: 64 }).notNull(), // 'crm', 'payment', 'ad_platform', 'email', etc.
  integrationName: varchar("integrationName", { length: 128 }).notNull(), // 'hubspot', 'stripe', 'google_ads', etc.
  displayName: varchar("displayName", { length: 255 }).notNull(),
  
  // Encrypted credentials
  encryptedCredentials: text("encryptedCredentials").notNull(),
  credentialType: mysqlEnum("credentialType", ["api_key", "oauth_token", "basic_auth", "custom"]).notNull(),
  
  // OAuth specific
  oauthToken: text("oauthToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  
  // Verification
  isVerified: boolean("isVerified").default(false),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "failed", "expired"]).default("pending"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  verificationError: text("verificationError"),
  
  // Usage
  isActive: boolean("isActive").default(true),
  lastUsedAt: timestamp("lastUsedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationCredential = typeof integrationCredentials.$inferSelect;
export type InsertIntegrationCredential = typeof integrationCredentials.$inferInsert;

// ─── Multi-Role Approvals ────────────────────────────────────────────────────
export const multiRoleApprovals = mysqlTable("multi_role_approvals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  approvalId: varchar("approvalId", { length: 36 }).notNull(),
  tenantId: int("tenantId").notNull(),
  
  requiredRoles: json("requiredRoles").$type<string[]>().notNull(),
  approvalChain: json("approvalChain").$type<{
    role: string;
    approvedBy?: number;
    approvedAt?: number;
    status: "pending" | "approved" | "rejected";
  }[]>().notNull(),
  
  allApprovalsReceived: boolean("allApprovalsReceived").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MultiRoleApproval = typeof multiRoleApprovals.$inferSelect;
export type InsertMultiRoleApproval = typeof multiRoleApprovals.$inferInsert;

// ─── Credential Rotation History ──────────────────────────────────────────
export const credentialRotationHistory = mysqlTable("credential_rotation_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  credentialId: varchar("credentialId", { length: 36 }).notNull(),
  tenantId: int("tenantId").notNull(),
  
  rotationType: mysqlEnum("rotationType", ["manual", "automatic", "emergency"]).notNull(),
  oldTokenHash: text("oldTokenHash"),
  newTokenHash: text("newTokenHash"),
  
  rotationStatus: mysqlEnum("rotationStatus", ["pending", "completed", "failed"]).default("pending"),
  rotationError: text("rotationError"),
  
  rotatedBy: int("rotatedBy"), // userId who initiated rotation
  rotatedAt: timestamp("rotatedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CredentialRotationHistory = typeof credentialRotationHistory.$inferSelect;
export type InsertCredentialRotationHistory = typeof credentialRotationHistory.$inferInsert;

// ─── Credential Audit Trail ───────────────────────────────────────────────
export const credentialAuditTrail = mysqlTable("credential_audit_trail", {
  id: varchar("id", { length: 36 }).primaryKey(),
  credentialId: varchar("credentialId", { length: 36 }).notNull(),
  tenantId: int("tenantId").notNull(),
  
  action: mysqlEnum("action", [
    "created",
    "verified",
    "used",
    "rotated",
    "refreshed",
    "disabled",
    "enabled",
    "deleted",
    "failed_verification",
  ]).notNull(),
  
  actionDetails: json("actionDetails"),
  performedBy: int("performedBy"), // userId
  
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CredentialAuditTrail = typeof credentialAuditTrail.$inferSelect;
export type InsertCredentialAuditTrail = typeof credentialAuditTrail.$inferInsert;

// ─── Credential Rotation Policies ─────────────────────────────────────────
export const credentialRotationPolicies = mysqlTable("credential_rotation_policies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: int("tenantId").notNull(),
  
  integrationName: varchar("integrationName", { length: 128 }).notNull(),
  rotationIntervalDays: int("rotationIntervalDays").notNull().default(90),
  
  autoRotateEnabled: boolean("autoRotateEnabled").default(false),
  rotationTime: varchar("rotationTime", { length: 5 }), // HH:MM format
  
  notifyBeforeDays: int("notifyBeforeDays").default(7),
  requireApprovalForRotation: boolean("requireApprovalForRotation").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CredentialRotationPolicy = typeof credentialRotationPolicies.$inferSelect;
export type InsertCredentialRotationPolicy = typeof credentialRotationPolicies.$inferInsert;

// ─── Company Management ────────────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  
  // Company Details
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 128 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  
  // Company Metrics
  monthlyRevenue: float("monthlyRevenue"),
  employeeCount: int("employeeCount"),
  foundedYear: int("foundedYear"),
  
  // Contact Information
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  
  // Additional Details
  location: varchar("location", { length: 255 }),
  socialMediaLinks: json("socialMediaLinks"), // { linkedin, twitter, facebook, instagram }
  customMetrics: json("customMetrics"), // Flexible field for custom KPIs
  
  // Status
  isActive: boolean("isActive").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ─── Company Memory System ────────────────────────────────────────────────
export const companyMemory = mysqlTable("company_memory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  companyId: varchar("companyId", { length: 36 }).notNull(),
  tenantId: int("tenantId").notNull(),
  
  // Memory Categories
  memoryType: mysqlEnum("memoryType", [
    "interaction_history",
    "performance_notes",
    "campaign_insights",
    "customer_feedback",
    "market_analysis",
    "strategic_goals",
    "custom_note",
  ]).notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  
  // Metadata
  tags: json("tags"), // Array of tags for organization
  importance: mysqlEnum("importance", ["low", "medium", "high"]).default("medium"),
  
  // AI-generated insights
  aiInsights: text("aiInsights"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanyMemory = typeof companyMemory.$inferSelect;
export type InsertCompanyMemory = typeof companyMemory.$inferInsert;

// ─── Company Performance Metrics ───────────────────────────────────────────
export const companyMetrics = mysqlTable("company_metrics", {
  id: varchar("id", { length: 36 }).primaryKey(),
  companyId: varchar("companyId", { length: 36 }).notNull(),
  tenantId: int("tenantId").notNull(),
  
  // Campaign Metrics
  totalCampaigns: int("totalCampaigns").default(0),
  activeCampaigns: int("activeCampaigns").default(0),
  totalAdSpend: float("totalAdSpend").default(0),
  totalConversions: int("totalConversions").default(0),
  averageROAS: float("averageROAS").default(0),
  
  // Performance Indicators
  leadGenerated: int("leadGenerated").default(0),
  conversionRate: float("conversionRate").default(0),
  customerAcquisitionCost: float("customerAcquisitionCost").default(0),
  
  // Growth Metrics
  monthOverMonthGrowth: float("monthOverMonthGrowth").default(0),
  yearOverYearGrowth: float("yearOverYearGrowth").default(0),
  
  // Last Updated
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyMetrics = typeof companyMetrics.$inferSelect;
export type InsertCompanyMetrics = typeof companyMetrics.$inferInsert;
