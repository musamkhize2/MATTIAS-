import { getDb } from "../db";
import { emailDeliveryStatus, webhookEventLog } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const getDatabase = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database connection not available");
  return db;
};

/**
 * Email Delivery Tracking Service
 * Manages email delivery status, webhook events, and engagement metrics
 */

export interface DeliveryStatusUpdate {
  campaignId: string;
  recipientEmail: string;
  status: "queued" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed" | "failed";
  messageId?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  eventType: "opened" | "clicked" | "bounced" | "unsubscribed" | "delivered";
  deliveryStatusId?: string;
  recipientEmail?: string;
  campaignId?: string;
  payload: Record<string, any>;
}

/**
 * Create or update email delivery status
 */
export async function updateDeliveryStatus(
  tenantId: number,
  update: DeliveryStatusUpdate
): Promise<typeof emailDeliveryStatus.$inferSelect> {
  const id = uuidv4();
  const db = await getDatabase();

  // Check if record exists
  const existing = await db
    .select()
    .from(emailDeliveryStatus)
    .where(
      and(
        eq(emailDeliveryStatus.campaignId, update.campaignId),
        eq(emailDeliveryStatus.recipientEmail, update.recipientEmail),
        eq(emailDeliveryStatus.tenantId, tenantId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    const record = existing[0];
    const updates: any = {
      status: update.status,
      lastEventTime: new Date(),
    };

    if (update.messageId) updates.messageId = update.messageId;
    if (update.failureReason) updates.failureReason = update.failureReason;
    if (update.metadata) updates.metadata = update.metadata;

    // Increment open/click counts
    if (update.status === "opened") {
      updates.openCount = (record.openCount || 0) + 1;
    } else if (update.status === "clicked") {
      updates.clickCount = (record.clickCount || 0) + 1;
    }

    await db
      .update(emailDeliveryStatus)
      .set(updates)
      .where(eq(emailDeliveryStatus.id, record.id));

    return { ...record, ...updates };
  }

  // Create new record
  const newRecord = {
    id,
    tenantId,
    campaignId: update.campaignId,
    recipientEmail: update.recipientEmail,
    status: update.status,
    messageId: update.messageId || null,
    failureReason: update.failureReason || null,
    metadata: update.metadata || null,
    openCount: update.status === "opened" ? 1 : 0,
    clickCount: update.status === "clicked" ? 1 : 0,
    lastEventTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(emailDeliveryStatus).values(newRecord);
  return newRecord;
}

/**
 * Get delivery status for a campaign
 */
export async function getCampaignDeliveryStatus(
  tenantId: number,
  campaignId: string
): Promise<typeof emailDeliveryStatus.$inferSelect[]> {
  const db = await getDatabase();
  return db
    .select()
    .from(emailDeliveryStatus)
    .where(
      and(
        eq(emailDeliveryStatus.tenantId, tenantId),
        eq(emailDeliveryStatus.campaignId, campaignId)
      )
    );
}

/**
 * Get delivery metrics for a campaign
 */
export async function getCampaignMetrics(tenantId: number, campaignId: string) {
  const statuses = await getCampaignDeliveryStatus(tenantId, campaignId);

  const metrics = {
    total: statuses.length,
    queued: statuses.filter((s) => s.status === "queued").length,
    sent: statuses.filter((s) => s.status === "sent").length,
    delivered: statuses.filter((s) => s.status === "delivered").length,
    opened: statuses.filter((s) => s.status === "opened").length,
    clicked: statuses.filter((s) => s.status === "clicked").length,
    bounced: statuses.filter((s) => s.status === "bounced").length,
    unsubscribed: statuses.filter((s) => s.status === "unsubscribed").length,
    failed: statuses.filter((s) => s.status === "failed").length,
  };

  return {
    ...metrics,
    deliveryRate: metrics.total > 0 ? (metrics.delivered / metrics.total) * 100 : 0,
    openRate: metrics.total > 0 ? (metrics.opened / metrics.total) * 100 : 0,
    clickRate: metrics.total > 0 ? (metrics.clicked / metrics.total) * 100 : 0,
    bounceRate: metrics.total > 0 ? (metrics.bounced / metrics.total) * 100 : 0,
    totalEngagement: metrics.opened + metrics.clicked,
  };
}

/**
 * Log webhook event
 */
export async function logWebhookEvent(
  tenantId: number,
  event: WebhookEvent,
  deliveryStatusId?: string
): Promise<typeof webhookEventLog.$inferSelect> {
  const id = uuidv4();
  const db = await getDatabase();

  const record = {
    id,
    tenantId,
    eventType: event.eventType,
    deliveryStatusId: deliveryStatusId ?? null,
    webhookPayload: event.payload,
    processed: false,
    processedAt: null,
    error: null,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(webhookEventLog).values(record);
  return record;
}

/**
 * Get unprocessed webhook events
 */
export async function getUnprocessedWebhookEvents(
  tenantId: number,
  limit: number = 100
): Promise<typeof webhookEventLog.$inferSelect[]> {
  const db = await getDatabase();
  return db
    .select()
    .from(webhookEventLog)
    .where(
      and(
        eq(webhookEventLog.tenantId, tenantId),
        eq(webhookEventLog.processed, false)
      )
    )
    .limit(limit);
}

/**
 * Mark webhook event as processed
 */
export async function markWebhookEventProcessed(
  eventId: string,
  success: boolean = true,
  error?: string
): Promise<void> {
  const db = await getDatabase();
  const updates: any = {
    processed: success,
    processedAt: new Date(),
  };

  if (error) {
    updates.error = error;
    updates.retryCount = (await db.select().from(webhookEventLog).where(eq(webhookEventLog.id, eventId)))[0]
      ?.retryCount || 0;
    updates.retryCount += 1;
  }

  await db.update(webhookEventLog).set(updates).where(eq(webhookEventLog.id, eventId));
}

/**
 * Get delivery status by recipient email
 */
export async function getDeliveryStatusByEmail(
  tenantId: number,
  recipientEmail: string
): Promise<typeof emailDeliveryStatus.$inferSelect[]> {
  const db = await getDatabase();
  return db
    .select()
    .from(emailDeliveryStatus)
    .where(
      and(
        eq(emailDeliveryStatus.tenantId, tenantId),
        eq(emailDeliveryStatus.recipientEmail, recipientEmail)
      )
    );
}

/**
 * Get delivery status summary by status type
 */
export async function getDeliveryStatusSummary(tenantId: number) {
  const db = await getDatabase();
  const allStatuses = await db
    .select()
    .from(emailDeliveryStatus)
    .where(eq(emailDeliveryStatus.tenantId, tenantId));

  const summary = {
    queued: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "queued").length,
    sent: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "sent").length,
    delivered: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "delivered").length,
    opened: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "opened").length,
    clicked: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "clicked").length,
    bounced: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "bounced").length,
    unsubscribed: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "unsubscribed").length,
    failed: allStatuses.filter((s: typeof emailDeliveryStatus.$inferSelect) => s.status === "failed").length,
    total: allStatuses.length,
  };

  return summary;
}
