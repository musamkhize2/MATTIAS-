import { getDb } from "../db";
import { dataSources, crmConnectors, events } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { EventTypes } from "./eventCatalog";
import crypto from "crypto";

// ─── Data Source Management ────────────────────────────────────────────────────

export interface WebhookPayload {
  type: string;
  data: Record<string, unknown>;
  timestamp?: number;
}

export async function createDataSource(
  tenantId: number,
  name: string,
  type: "webhook" | "crm" | "api",
  config: Record<string, unknown>
): Promise<{ id: number; webhookUrl?: string; webhookSecret: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const webhookSecret = crypto.randomBytes(32).toString("hex");

  const result = await db.insert(dataSources).values({
    tenantId,
    name,
    type,
    config,
    webhookSecret,
    isActive: true,
  });

  // Drizzle returns insertId in the result object
  const insertResult = result as any;
  const sourceId = insertResult.insertId || insertResult[0]?.insertId || 0;
  const webhookUrl =
    type === "webhook"
      ? `${process.env.VITE_FRONTEND_FORGE_API_URL || "https://mattias.local"}/api/webhooks/${sourceId}`
      : undefined;

  return { id: sourceId as number, webhookUrl, webhookSecret };
}

export async function getDataSources(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(dataSources)
    .where(eq(dataSources.tenantId, tenantId));
}

export async function deleteDataSource(sourceId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(dataSources)
    .where(and(eq(dataSources.id, sourceId), eq(dataSources.tenantId, tenantId)));

  return true;
}

export async function toggleDataSource(sourceId: number, tenantId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(dataSources)
    .set({ isActive })
    .where(and(eq(dataSources.id, sourceId), eq(dataSources.tenantId, tenantId)));

  return true;
}

// ─── CRM Connector Management ──────────────────────────────────────────────────

export interface CRMConfig extends Record<string, unknown> {
  apiKey?: string;
  apiUrl?: string;
  accountId?: string;
  workspace?: string;
}

export async function createCRMConnector(
  tenantId: number,
  crmType: "hubspot" | "salesforce" | "pipedrive",
  displayName: string,
  oauthToken: string,
  config?: CRMConfig,
  eventMappings?: Record<string, string>
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(crmConnectors).values({
    tenantId,
    crmType,
    displayName,
    oauthToken,
    config: config || {},
    eventMappings: eventMappings || getDefaultEventMappings(crmType),
    isActive: true,
  });

  // Drizzle returns the result with insertId in a specific format
  const insertResult = result as any;
  return insertResult.insertId || insertResult[0]?.insertId || 0;
}

export async function getCRMConnectors(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(crmConnectors)
    .where(eq(crmConnectors.tenantId, tenantId));
}

export async function deleteCRMConnector(connectorId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(crmConnectors)
    .where(and(eq(crmConnectors.id, connectorId), eq(crmConnectors.tenantId, tenantId)));

  return true;
}

export async function toggleCRMConnector(connectorId: number, tenantId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(crmConnectors)
    .set({ isActive })
    .where(and(eq(crmConnectors.id, connectorId), eq(crmConnectors.tenantId, tenantId)));

  return true;
}

// ─── Webhook Event Processing ─────────────────────────────────────────────────

export async function processWebhookEvent(
  sourceId: number,
  tenantId: number,
  payload: WebhookPayload
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get the data source
  const source = await db
    .select()
    .from(dataSources)
    .where(and(eq(dataSources.id, sourceId), eq(dataSources.tenantId, tenantId)))
    .limit(1);

  if (!source.length || !source[0].isActive) return false;

  // Map webhook event to MATTIAS event type
  const eventType = mapWebhookEventType(source[0].type as string, payload.type);
  if (!eventType) return false;

  // Store the event
  await db.insert(events).values({
    tenantId,
    eventType,
    aggregateId: `webhook-${sourceId}`,
    aggregateType: "webhook",
    data: payload.data,
    source: `webhook-${sourceId}`,
    occurrenceTime: new Date(payload.timestamp || Date.now()),
  });

  return true;
}

export async function processCRMEvent(
  connectorId: number,
  tenantId: number,
  crmEventType: string,
  crmData: Record<string, unknown>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get the CRM connector
  const connector = await db
    .select()
    .from(crmConnectors)
    .where(and(eq(crmConnectors.id, connectorId), eq(crmConnectors.tenantId, tenantId)))
    .limit(1);

  if (!connector.length || !connector[0].isActive) return false;

  // Map CRM event to MATTIAS event using the mapping
  const mappings = (connector[0].eventMappings as Record<string, string>) || {};
  const eventType = mappings[crmEventType];

  if (!eventType) return false;

  // Store the event
  await db.insert(events).values({
    tenantId,
    eventType,
    aggregateId: `crm-${connectorId}`,
    aggregateType: "crm",
    data: crmData,
    source: `crm-${connector[0].crmType}`,
    occurrenceTime: new Date(),
  });

  return true;
}

// ─── Event Type Mapping ───────────────────────────────────────────────────────

function mapWebhookEventType(sourceType: string, webhookEventType: string): string | null {
  const mappings: Record<string, Record<string, string>> = {
    webhook: {
      "lead.created": EventTypes.LEAD_CAPTURED,
      "lead.updated": EventTypes.LEAD_CAPTURED,
      "deal.created": EventTypes.PAYMENT_APPROVED,
      "deal.won": EventTypes.PAYMENT_APPROVED,
      "contact.created": EventTypes.LEAD_CAPTURED,
      "payment.completed": EventTypes.PAYMENT_APPROVED,
      "payment.failed": EventTypes.CASHFLOW_SHORTFALL_DETECTED,
      "contract.created": EventTypes.CONTRACT_RISK_FLAGGED,
      "task.created": EventTypes.TASK_CREATED,
      "campaign.launched": EventTypes.CAMPAIGN_LAUNCHED,
    },
  };

  return mappings[sourceType]?.[webhookEventType] || null;
}

function getDefaultEventMappings(crmType: string): Record<string, string> {
  const mappings: Record<string, Record<string, string>> = {
    hubspot: {
      "contact.creation": EventTypes.LEAD_CAPTURED,
      "deal.creation": EventTypes.PAYMENT_APPROVED,
      "deal.stage.change": EventTypes.PAYMENT_APPROVED,
      "contact.propertyChange": EventTypes.LEAD_CAPTURED,
    },
    salesforce: {
      "Lead__c.created": EventTypes.LEAD_CAPTURED,
      "Opportunity.created": EventTypes.PAYMENT_APPROVED,
      "Opportunity.updated": EventTypes.PAYMENT_APPROVED,
      "Account.created": EventTypes.LEAD_CAPTURED,
    },
    pipedrive: {
      "added.person": EventTypes.LEAD_CAPTURED,
      "added.deal": EventTypes.PAYMENT_APPROVED,
      "updated.deal": EventTypes.PAYMENT_APPROVED,
      "added.activity": EventTypes.TASK_CREATED,
    },
  };

  return mappings[crmType] || {};
}
