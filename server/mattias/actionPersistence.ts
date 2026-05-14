import { getDb } from "../db";
import { actions, emailCampaigns, actionHistory } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Action Persistence Layer - Handles real database storage for actions
 */

export interface ActionRecord {
  id: string;
  tenantId: number;
  userId: number;
  type: string;
  status: "pending" | "executing" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "critical";
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface EmailCampaignRecord {
  id: string;
  tenantId: number;
  userId: number;
  name: string;
  templateId: string;
  status: "draft" | "scheduled" | "sending" | "sent";
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  recipients: any[];
  actionId?: string;
  createdAt: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  updatedAt: Date;
}

/**
 * Create a new action record in the database
 */
export async function createAction(
  tenantId: number,
  userId: number,
  type: string,
  priority: "low" | "medium" | "high" | "critical",
  payload: Record<string, any>
): Promise<ActionRecord> {
  const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(actions).values({
    id: actionId,
    tenantId,
    userId,
    type,
    status: "pending",
    priority,
    payload,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: actionId,
    tenantId,
    userId,
    type,
    status: "pending",
    priority,
    payload,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update action status and result
 */
export async function updateActionStatus(
  actionId: string,
  status: "pending" | "executing" | "completed" | "failed",
  result?: Record<string, any>,
  error?: string
): Promise<ActionRecord | null> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "executing") {
    updateData.executedAt = new Date();
  }

  if (status === "completed") {
    updateData.completedAt = new Date();
    if (result) {
      updateData.result = result;
    }
  }

  if (status === "failed" && error) {
    updateData.error = error;
  }

  await database.update(actions).set(updateData).where(eq(actions.id, actionId));

  // Add history entry
  await addActionHistory(actionId, status, `Status changed to ${status}`, { result, error });

  return getAction(actionId);
}

/**
 * Get action by ID
 */
export async function getAction(actionId: string): Promise<ActionRecord | null> {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(actions).where(eq(actions.id, actionId));
  return (result[0] as any) || null;
}

/**
 * Get actions by tenant
 */
export async function getActionsByTenant(
  tenantId: number,
  limit: number = 20,
  offset: number = 0
): Promise<ActionRecord[]> {
  const database = await getDb();
  if (!database) return [];
  const result = await database
    .select()
    .from(actions)
    .where(eq(actions.tenantId, tenantId))
    .limit(limit)
    .offset(offset);
  return result as any;
}

/**
 * Get actions by status
 */
export async function getActionsByStatus(
  tenantId: number,
  status: "pending" | "executing" | "completed" | "failed"
): Promise<ActionRecord[]> {
  const database = await getDb();
  if (!database) return [];
  const result = await database
    .select()
    .from(actions)
    .where(and(eq(actions.tenantId, tenantId), eq(actions.status, status)));
  return result as any;
}

/**
 * Increment retry count
 */
export async function incrementRetryCount(actionId: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  const action = await getAction(actionId);

  if (action && action.retryCount < action.maxRetries) {
    await database
      .update(actions)
      .set({
        retryCount: action.retryCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(actions.id, actionId));
  }
}

/**
 * Create email campaign record
 */
export async function createEmailCampaign(
  tenantId: number,
  userId: number,
  name: string,
  templateId: string,
  recipients: any[]
): Promise<EmailCampaignRecord> {
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.insert(emailCampaigns).values({
    id: campaignId,
    tenantId,
    userId,
    name,
    templateId,
    status: "draft",
    recipientCount: recipients.length,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    recipients,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: campaignId,
    tenantId,
    userId,
    name,
    templateId,
    status: "draft",
    recipientCount: recipients.length,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    recipients,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update email campaign
 */
export async function updateEmailCampaign(
  campaignId: string,
  updates: Partial<EmailCampaignRecord>
): Promise<EmailCampaignRecord | null> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .update(emailCampaigns)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  return getEmailCampaign(campaignId);
}

/**
 * Get email campaign by ID
 */
export async function getEmailCampaign(campaignId: string): Promise<EmailCampaignRecord | null> {
  const database = await getDb();
  if (!database) return null;
  const result = await database
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId));
  return (result[0] as any) || null;
}

/**
 * Get email campaigns by tenant
 */
export async function getEmailCampaignsByTenant(
  tenantId: number,
  limit: number = 20,
  offset: number = 0
): Promise<EmailCampaignRecord[]> {
  const database = await getDb();
  if (!database) return [];
  const result = await database
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.tenantId, tenantId))
    .limit(limit)
    .offset(offset);
  return result as any;
}

/**
 * Add action history entry
 */
export async function addActionHistory(
  actionId: string,
  status: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  const database = await getDb();
  if (!database) return;
  const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const action = await getAction(actionId);
  if (!action) return;

  await database.insert(actionHistory).values({
    id: historyId,
    actionId,
    tenantId: action.tenantId,
    status,
    message,
    metadata,
    createdAt: new Date(),
  });
}

/**
 * Get action history
 */
export async function getActionHistoryForAction(
  actionId: string,
  limit: number = 50
): Promise<any[]> {
  const database = await getDb();
  if (!database) return [];
  const result = await database
    .select()
    .from(actionHistory)
    .where(eq(actionHistory.actionId, actionId))
    .limit(limit);
  return result as any;
}

/**
 * Get pending actions for retry
 */
export async function getPendingActionsForRetry(
  tenantId: number,
  maxRetries: number = 3
): Promise<ActionRecord[]> {
  const database = await getDb();
  if (!database) return [];
  const result = await database
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.tenantId, tenantId),
        eq(actions.status, "pending")
        // Note: retryCount < maxRetries would require a more complex query
      )
    );
  return result as any;
}
