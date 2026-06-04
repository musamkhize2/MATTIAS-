import { mysqlTable, mysqlSchema, AnyMySqlColumn, varchar, int, text, json, timestamp, mysqlEnum, float, index, bigint, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"

export const actionHistory = mysqlTable("actionHistory", {
	id: varchar({ length: 64 }).notNull(),
	actionId: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	status: varchar({ length: 64 }).notNull(),
	message: text(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const actions = mysqlTable("actions", {
	id: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	type: varchar({ length: 64 }).notNull(),
	status: mysqlEnum(['pending','executing','completed','failed']).default('pending').notNull(),
	priority: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	payload: json().notNull(),
	result: json(),
	error: text(),
	retryCount: int().default(0).notNull(),
	maxRetries: int().default(3).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	executedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agentConfigs = mysqlTable("agent_configs", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	agentName: varchar({ length: 128 }).notNull(),
	config: json().notNull(),
	enabled: boolean().default(true),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const approvals = mysqlTable("approvals", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	eventType: varchar({ length: 128 }).notNull(),
	eventData: json().notNull(),
	agentName: varchar({ length: 128 }),
	agentReasoning: text(),
	actionType: varchar({ length: 128 }).notNull(),
	actionPayload: json(),
	requestedBy: int(),
	riskScore: float(),
	status: mysqlEnum(['PENDING','APPROVED','REJECTED']).default('PENDING').notNull(),
	correlationId: varchar({ length: 128 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	resolvedAt: timestamp({ mode: 'string' }),
});

export const businessProfiles = mysqlTable("business_profiles", {
	id: varchar({ length: 36 }).notNull(),
	tenantId: int().notNull(),
	ownerUserId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	legalName: varchar({ length: 255 }),
	description: text(),
	industry: varchar({ length: 128 }),
	businessActivities: json(),
	websiteUrl: varchar({ length: 512 }),
	logoUrl: varchar({ length: 512 }),
	annualRevenueTarget: float(),
	monthlyRevenueTarget: float(),
	avgDealSize: float(),
	avgUnitPrice: float(),
	targetMarginPercent: float(),
	currency: varchar({ length: 3 }).default('USD'),
	operationalHours: json(),
	defaultLanguage: varchar({ length: 10 }).default('en'),
	aiConfig: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const commandHistory = mysqlTable("command_history", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	userId: int(),
	command: text().notNull(),
	response: text(),
	agentsInvolved: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const crmConnectors = mysqlTable("crm_connectors", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	crmType: varchar({ length: 64 }).notNull(),
	displayName: varchar({ length: 255 }).notNull(),
	oauthToken: text(),
	refreshToken: text(),
	tokenExpiresAt: timestamp({ mode: 'string' }),
	config: json(),
	eventMappings: json(),
	isActive: boolean().default(true).notNull(),
	lastSyncAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const dataSources = mysqlTable("data_sources", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 64 }).notNull(),
	config: json().notNull(),
	webhookSecret: varchar({ length: 255 }),
	isActive: boolean().default(true).notNull(),
	lastSyncAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emailCampaigns = mysqlTable("emailCampaigns", {
	id: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	templateId: varchar({ length: 64 }).notNull(),
	status: mysqlEnum(['draft','scheduled','sending','sent']).default('draft').notNull(),
	recipientCount: int().default(0).notNull(),
	sentCount: int().default(0).notNull(),
	openCount: int().default(0).notNull(),
	clickCount: int().default(0).notNull(),
	recipients: json().notNull(),
	actionId: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	scheduledAt: timestamp({ mode: 'string' }),
	sentAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emailDeliveryStatus = mysqlTable("emailDeliveryStatus", {
	id: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	campaignId: varchar({ length: 64 }).notNull(),
	recipientEmail: varchar({ length: 320 }).notNull(),
	status: mysqlEnum(['queued','sent','delivered','opened','clicked','bounced','unsubscribed','failed']).default('queued').notNull(),
	messageId: varchar({ length: 255 }),
	openCount: int().default(0).notNull(),
	clickCount: int().default(0).notNull(),
	lastEventTime: timestamp({ mode: 'string' }),
	failureReason: text(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_campaignId").on(table.campaignId),
	index("idx_recipientEmail").on(table.recipientEmail),
	index("idx_status").on(table.status),
	index("idx_tenantId").on(table.tenantId),
]);

export const entities = mysqlTable("entities", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	type: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	currentState: json().notNull(),
	version: int().default(0),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const events = mysqlTable("events", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	tenantId: int().notNull(),
	eventType: varchar({ length: 128 }).notNull(),
	aggregateId: varchar({ length: 128 }).notNull(),
	aggregateType: varchar({ length: 64 }).notNull(),
	occurrenceTime: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	data: json().notNull(),
	causationId: bigint({ mode: "number" }),
	correlationId: varchar({ length: 128 }),
	source: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const featureFlags = mysqlTable("feature_flags", {
	id: int().autoincrement().notNull(),
	featureKey: varchar({ length: 128 }).notNull(),
	description: text(),
	enabledTiers: json(),
},
(table) => [
	index("feature_flags_featureKey_unique").on(table.featureKey),
]);

export const integrationCredentials = mysqlTable("integration_credentials", {
	id: varchar({ length: 36 }).notNull(),
	tenantId: int().notNull(),
	businessProfileId: varchar({ length: 36 }),
	integrationType: varchar({ length: 64 }).notNull(),
	integrationName: varchar({ length: 128 }).notNull(),
	displayName: varchar({ length: 255 }).notNull(),
	encryptedCredentials: text().notNull(),
	credentialType: mysqlEnum(['api_key','oauth_token','basic_auth','custom']).notNull(),
	oauthToken: text(),
	refreshToken: text(),
	tokenExpiresAt: timestamp({ mode: 'string' }),
	isVerified: boolean().default(false),
	verificationStatus: mysqlEnum(['pending','verified','failed','expired']).default('pending'),
	lastVerifiedAt: timestamp({ mode: 'string' }),
	verificationError: text(),
	isActive: boolean().default(true),
	lastUsedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const memoryEmbeddings = mysqlTable("memory_embeddings", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	content: text().notNull(),
	eventId: bigint({ mode: "number" }),
	embedding: json(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const multiRoleApprovals = mysqlTable("multi_role_approvals", {
	id: varchar({ length: 36 }).notNull(),
	approvalId: varchar({ length: 36 }).notNull(),
	tenantId: int().notNull(),
	requiredRoles: json().notNull(),
	approvalChain: json().notNull(),
	allApprovalsReceived: boolean().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const policies = mysqlTable("policies", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	eventConditions: json().notNull(),
	actionConditions: json(),
	effect: mysqlEnum(['ALLOW','DENY','REQUIRE_APPROVAL']).notNull(),
	precedence: int().default(0),
	enabled: boolean().default(true),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const relationships = mysqlTable("relationships", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	fromEntityId: int().notNull(),
	toEntityId: int().notNull(),
	relationshipType: varchar({ length: 64 }).notNull(),
	properties: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const tenants = mysqlTable("tenants", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	subscriptionTier: mysqlEnum(['personal','professional','enterprise']).default('personal').notNull(),
	autonomyLevel: mysqlEnum(['manual','assisted','approval_guarded','autonomous']).default('assisted').notNull(),
	features: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	tenantId: int(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

export const webhookEventLog = mysqlTable("webhookEventLog", {
	id: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	eventType: varchar({ length: 64 }).notNull(),
	deliveryStatusId: varchar({ length: 64 }),
	webhookPayload: json().notNull(),
	processed: boolean().default(0).notNull(),
	processedAt: timestamp({ mode: 'string' }),
	error: text(),
	retryCount: int().default(0).notNull(),
	maxRetries: int().default(3).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_eventType").on(table.eventType),
	index("idx_processed").on(table.processed),
	index("idx_tenantId").on(table.tenantId),
]);

export const workflowDefinitions = mysqlTable("workflow_definitions", {
	id: int().autoincrement().notNull(),
	tenantId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	startEventType: varchar({ length: 128 }).notNull(),
	definition: json().notNull(),
	enabled: boolean().default(true),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});


// ─── Companies & Business Profiles ────────────────────────────────────────────
export const companies = mysqlTable("companies", {
	id: varchar({ length: 36 }).primaryKey(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	industry: varchar({ length: 128 }),
	website: varchar({ length: 255 }),
	description: text(),
	monthlyRevenue: float(),
	employeeCount: int(),
	foundedYear: int(),
	contactEmail: varchar({ length: 320 }),
	contactPhone: varchar({ length: 20 }),
	location: varchar({ length: 255 }),
	socialMediaLinks: json(),
	customMetrics: json(),
	isActive: boolean().default(true),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export const companyMemory = mysqlTable("company_memory", {
	id: varchar({ length: 36 }).primaryKey(),
	companyId: varchar({ length: 36 }).notNull(),
	tenantId: int().notNull(),
	memoryType: mysqlEnum(["interaction_history", "performance_notes", "campaign_insights", "customer_feedback", "market_analysis", "strategic_goals", "custom_note"]).notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	tags: json(),
	importance: mysqlEnum(["low", "medium", "high"]).default("medium"),
	aiInsights: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type CompanyMemory = typeof companyMemory.$inferSelect;
export type InsertCompanyMemory = typeof companyMemory.$inferInsert;

export const companyMetrics = mysqlTable("company_metrics", {
	id: varchar({ length: 36 }).primaryKey(),
	companyId: varchar({ length: 36 }).notNull(),
	tenantId: int().notNull(),
	totalCampaigns: int().default(0),
	activeCampaigns: int().default(0),
	totalAdSpend: float().default(0),
	totalConversions: int().default(0),
	averageROAS: float().default(0),
	leadGenerated: int().default(0),
	conversionRate: float().default(0),
	customerAcquisitionCost: float().default(0),
	monthOverMonthGrowth: float().default(0),
	yearOverYearGrowth: float().default(0),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export type CompanyMetrics = typeof companyMetrics.$inferSelect;
export type InsertCompanyMetrics = typeof companyMetrics.$inferInsert;


// ─── AI Chat & Conversations ───────────────────────────────────────────────────
export const conversationHistory = mysqlTable("conversation_history", {
	id: varchar({ length: 64 }).primaryKey(),
	conversationId: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	role: mysqlEnum(["system", "user", "assistant"]).notNull(),
	content: text().notNull(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export type ConversationHistory = typeof conversationHistory.$inferSelect;
export type InsertConversationHistory = typeof conversationHistory.$inferInsert;

export const conversations = mysqlTable("conversations", {
	id: varchar({ length: 64 }).primaryKey(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	title: varchar({ length: 255 }).notNull(),
	systemPrompt: text(),
	isArchived: boolean().default(false),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;


// ─── Voice Interactions ────────────────────────────────────────────────────────
export const voiceInteractions = mysqlTable("voice_interactions", {
	id: varchar({ length: 64 }).primaryKey(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	audioUrl: text().notNull(),
	transcribedText: text().notNull(),
	language: varchar({ length: 10 }).default("en"),
	duration: int().default(0),
	confidence: varchar({ length: 10 }).default("0.95"),
	status: mysqlEnum(["pending", "completed", "failed", "executed"]).default("pending"),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export type VoiceInteraction = typeof voiceInteractions.$inferSelect;
export type InsertVoiceInteraction = typeof voiceInteractions.$inferInsert;


// ─── Integration Health Monitoring ─────────────────────────────────────────────
export const integrationStatus = mysqlTable("integration_status", {
	id: varchar({ length: 64 }).primaryKey(),
	tenantId: int().notNull(),
	integrationName: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(["healthy", "warning", "error"]).default("healthy"),
	lastChecked: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	errorMessage: text(),
	successRate: int().default(100),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type IntegrationStatus = typeof integrationStatus.$inferSelect;
export type InsertIntegrationStatus = typeof integrationStatus.$inferInsert;

// ─── Voice Profiles ────────────────────────────────────────────────────────
export const voiceProfiles = mysqlTable("voice_profiles", {
	id: varchar({ length: 64 }).primaryKey(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	triggerPhrase: varchar({ length: 255 }).notNull(),
	enabled: boolean().default(true),
	executionCount: int().default(0),
	lastExecutedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type InsertVoiceProfile = typeof voiceProfiles.$inferInsert;

// ─── Voice Profile Commands ────────────────────────────────────────────────
export const voiceProfileCommands = mysqlTable("voice_profile_commands", {
	id: varchar({ length: 64 }).primaryKey(),
	profileId: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	action: varchar({ length: 255 }).notNull(),
	parameters: json().notNull(),
	delay: int().default(0),
	description: text(),
	sequenceOrder: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});
export type VoiceProfileCommand = typeof voiceProfileCommands.$inferSelect;
export type InsertVoiceProfileCommand = typeof voiceProfileCommands.$inferInsert;

// ─── Voice Profile Executions ────────────────────────────────────────────────
export const voiceProfileExecutions = mysqlTable("voice_profile_executions", {
	id: varchar({ length: 64 }).primaryKey(),
	profileId: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	status: mysqlEnum(["pending", "executing", "completed", "failed"]).default("pending"),
	startedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
	error: text(),
	results: json(),
	duration: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});
export type VoiceProfileExecution = typeof voiceProfileExecutions.$inferSelect;
export type InsertVoiceProfileExecution = typeof voiceProfileExecutions.$inferInsert;

// ─── Voice Profile Analytics ────────────────────────────────────────────────
export const voiceProfileAnalytics = mysqlTable("voice_profile_analytics", {
	id: varchar({ length: 64 }).primaryKey(),
	profileId: varchar({ length: 64 }).notNull(),
	tenantId: int().notNull(),
	userId: int().notNull(),
	totalExecutions: int().default(0),
	successfulExecutions: int().default(0),
	failedExecutions: int().default(0),
	averageExecutionTime: int().default(0),
	lastExecutedAt: timestamp({ mode: 'string' }),
	successRate: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});
export type VoiceProfileAnalytics = typeof voiceProfileAnalytics.$inferSelect;
export type InsertVoiceProfileAnalytics = typeof voiceProfileAnalytics.$inferInsert;
