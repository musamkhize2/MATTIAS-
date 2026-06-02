import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendSlackNotification, sendEmailNotification } from "./notificationService";
import { getDomainConfig } from "./domainConfig";

export interface ApprovalQueueItem {
  id: string;
  tenantId: number;
  actionType: "campaign_send" | "policy_change" | "data_export" | "integration_connect";
  actionDescription: string;
  requiredApprovals: number;
  currentApprovals: number;
  createdAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Create an approval queue item and notify stakeholders
 */
export async function createApprovalQueueItem(
  tenantId: number,
  actionType: ApprovalQueueItem["actionType"],
  actionDescription: string,
  requiredApprovals: number = 1,
  metadata: Record<string, unknown> = {}
): Promise<ApprovalQueueItem> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get tenant to access notification settings
  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenantRows || tenantRows.length === 0) {
    throw new Error("Tenant not found");
  }

  const tenant = tenantRows[0];
  const config = await getDomainConfig(tenantId);
  const notificationEmail = config.notificationEmail;
  const slackWebhookUrl = config.slackWebhookUrl;

  // Create approval queue item
  const approvalItem: ApprovalQueueItem = {
    id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    actionType,
    actionDescription,
    requiredApprovals,
    currentApprovals: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    metadata,
  };

  // Notify stakeholders
  if (notificationEmail || slackWebhookUrl) {
    const payload = {
      title: `Approval Required: ${actionDescription}`,
      message: `Action "${actionDescription}" requires ${requiredApprovals} approval(s). Expires at ${approvalItem.expiresAt.toISOString()}`,
      type: "approval_pending" as const,
      metadata: {
        approvalId: approvalItem.id,
        actionType,
        requiredApprovals,
        expiresAt: approvalItem.expiresAt.toISOString(),
      },
    };

    if (slackWebhookUrl) {
      await sendSlackNotification(slackWebhookUrl, payload);
    }
    if (notificationEmail) {
      await sendEmailNotification(notificationEmail, payload);
    }
  }

  return approvalItem;
}

/**
 * Approve an item in the approval queue
 */
export async function approveQueueItem(
  tenantId: number,
  approvalId: string,
  approverName: string,
  approverEmail: string
): Promise<{ approved: boolean; currentApprovals: number; requiresMoreApprovals: boolean }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get tenant
  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenantRows || tenantRows.length === 0) {
    throw new Error("Tenant not found");
  }

  const tenant = tenantRows[0];
  const config = await getDomainConfig(tenantId);
  const notificationEmail2 = config.notificationEmail;
  const slackWebhookUrl2 = config.slackWebhookUrl;

  // Simulate approval (in production, this would update a database table)
  const currentApprovals = 1;
  const requiredApprovals = 1;
  const isFullyApproved = currentApprovals >= requiredApprovals;

  if (isFullyApproved && (notificationEmail2 || slackWebhookUrl2)) {
    const payload = {
      title: `Approval Completed: ${approvalId}`,
      message: `Action has been approved by ${approverName} (${approverEmail})`,
      type: "approval_pending" as const,
      metadata: {
        approvalId,
        status: "approved",
        approverName,
        approverEmail,
      },
    };

    if (slackWebhookUrl2) {
      await sendSlackNotification(slackWebhookUrl2, payload);
    }
    if (notificationEmail2) {
      await sendEmailNotification(notificationEmail2, payload);
    }
  }

  return {
    approved: isFullyApproved,
    currentApprovals,
    requiresMoreApprovals: !isFullyApproved,
  };
}

/**
 * Reject an item in the approval queue
 */
export async function rejectQueueItem(
  tenantId: number,
  approvalId: string,
  rejectorName: string,
  rejectorEmail: string,
  reason: string
): Promise<{ rejected: boolean }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get tenant
  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenantRows || tenantRows.length === 0) {
    throw new Error("Tenant not found");
  }

  const tenant = tenantRows[0];

  // Notify on rejection
  const config = await getDomainConfig(tenantId);
  const notificationEmail3 = config.notificationEmail;
  const slackWebhookUrl3 = config.slackWebhookUrl;

  if (notificationEmail3 || slackWebhookUrl3) {
    const payload = {
      title: `Approval Rejected: ${approvalId}`,
      message: `Action has been rejected by ${rejectorName} (${rejectorEmail}). Reason: ${reason}`,
      type: "approval_pending" as const,
      metadata: {
        approvalId,
        status: "rejected",
        rejectorName,
        rejectorEmail,
        reason,
      },
    };

    if (slackWebhookUrl3) {
      await sendSlackNotification(slackWebhookUrl3, payload);
    }
    if (notificationEmail3) {
      await sendEmailNotification(notificationEmail3, payload);
    }
  }

  return { rejected: true };
}

/**
 * Get pending approvals for a tenant
 */
export async function getPendingApprovals(tenantId: number): Promise<ApprovalQueueItem[]> {
  // In production, this would query a database table
  // For now, return empty array
  return [];
}

/**
 * Get approval queue item by ID
 */
export async function getApprovalQueueItem(
  tenantId: number,
  approvalId: string
): Promise<ApprovalQueueItem | null> {
  // In production, this would query a database table
  // For now, return null
  return null;
}
