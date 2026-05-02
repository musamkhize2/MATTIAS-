import { z } from "zod";
import { getDb } from "../db";
import { approvals, multiRoleApprovals } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Approval automation rules for conditional routing and escalation
 */
export const ApprovalAutomationRuleSchema = z.object({
  approvalType: z.string().describe("Type of approval (e.g., payment, contract, campaign)"),
  riskThreshold: z.number().describe("Risk score threshold for escalation"),
  escalateTo: z.array(z.string()).describe("User roles to escalate to (e.g., ['ceo', 'cfo'])"),
  notifyChannels: z.array(z.enum(["slack", "email", "in_app"])).default(["in_app"]),
  timeoutMinutes: z.number().default(1440).describe("Approval timeout in minutes"),
  autoRejectIfExpired: z.boolean().default(false),
});

export type ApprovalAutomationRule = z.infer<typeof ApprovalAutomationRuleSchema>;

/**
 * Default automation rules
 */
const DEFAULT_AUTOMATION_RULES: Record<string, ApprovalAutomationRule> = {
  payment: {
    approvalType: "payment",
    riskThreshold: 8000,
    escalateTo: ["ceo", "cfo"],
    notifyChannels: ["slack", "email", "in_app"],
    timeoutMinutes: 240,
    autoRejectIfExpired: false,
  },
  contract: {
    approvalType: "contract",
    riskThreshold: 7000,
    escalateTo: ["legal", "ceo"],
    notifyChannels: ["email", "in_app"],
    timeoutMinutes: 1440,
    autoRejectIfExpired: false,
  },
  campaign: {
    approvalType: "campaign",
    riskThreshold: 6000,
    escalateTo: ["marketing_lead", "ceo"],
    notifyChannels: ["slack", "in_app"],
    timeoutMinutes: 480,
    autoRejectIfExpired: false,
  },
};

/**
 * Determine approval routing based on risk score and automation rules
 */
export function determineApprovalRouting(
  approvalType: string,
  riskScore: number,
  rule?: ApprovalAutomationRule
): {
  requiresApproval: boolean;
  escalateTo: string[];
  notifyChannels: string[];
  timeoutMinutes: number;
} {
  const automationRule = rule || DEFAULT_AUTOMATION_RULES[approvalType];

  if (!automationRule) {
    return {
      requiresApproval: true,
      escalateTo: ["admin"],
      notifyChannels: ["in_app"],
      timeoutMinutes: 1440,
    };
  }

  const requiresApproval = riskScore >= automationRule.riskThreshold;
  const escalateTo = requiresApproval ? automationRule.escalateTo : [];

  return {
    requiresApproval,
    escalateTo,
    notifyChannels: automationRule.notifyChannels,
    timeoutMinutes: automationRule.timeoutMinutes,
  };
}

/**
 * Create approval with automatic routing and notifications
 */
export async function createApprovalWithAutomation(
  approvalData: {
    approvalType: string;
    riskScore: number;
    actionPayload: Record<string, unknown>;
    eventData: Record<string, unknown>;
    tenantId: number;
    userId: number;
  },
  automationRule?: ApprovalAutomationRule
): Promise<{ approvalId: number; routed: boolean; escalatedTo: string[] }> {
  const routing = determineApprovalRouting(approvalData.approvalType, approvalData.riskScore, automationRule);

  // Placeholder implementation - in production, integrate with actual approval creation
  const approvalId = Math.floor(Math.random() * 1000000);

  // Send notifications if escalation is needed
  if (routing.escalateTo.length > 0) {
    await sendApprovalNotifications(
      approvalId,
      approvalData,
      routing.escalateTo,
      routing.notifyChannels
    );
  }

  return {
    approvalId,
    routed: routing.escalateTo.length > 0,
    escalatedTo: routing.escalateTo,
  };
}

/**
 * Send approval notifications to relevant stakeholders
 */
async function sendApprovalNotifications(
  approvalId: number,
  approvalData: {
    approvalType: string;
    riskScore: number;
    actionPayload: Record<string, unknown>;
    eventData: Record<string, unknown>;
    tenantId: number;
    userId: number;
  },
  escalateTo: string[],
  channels: string[]
): Promise<void> {
  const title = `New ${approvalData.approvalType} Approval Required`;
  const content = `
A new ${approvalData.approvalType} approval has been created with a risk score of ${approvalData.riskScore}.

**Approval ID:** ${approvalId}
**Type:** ${approvalData.approvalType}
**Risk Score:** ${approvalData.riskScore}
**Escalated To:** ${escalateTo.join(", ")}

**Action Payload:**
\`\`\`json
${JSON.stringify(approvalData.actionPayload, null, 2)}
\`\`\`

Please review and approve or reject this action in the MATTIAS Approval Queue.
  `;

  // Send in-app notification to owner
  if (channels.includes("in_app")) {
    await notifyOwner({ title, content });
  }

  // TODO: Implement Slack and email notifications
  // if (channels.includes("slack")) {
  //   await sendSlackNotification(title, content, escalateTo);
  // }
  // if (channels.includes("email")) {
  //   await sendEmailNotification(title, content, escalateTo);
  // }
}

/**
 * Check for expired approvals and handle auto-rejection
 */
export async function handleExpiredApprovals(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find approvals that have exceeded their timeout
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const expiredApprovals = await db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.status, "PENDING"),
        gt(approvals.createdAt, oneHourAgo) // Adjust based on timeout rules
      )
    );

  for (const approval of expiredApprovals) {
    // Auto-reject if configured
    // This would be determined by the automation rule
    // For now, just log as expired
    console.log(`Approval ${approval.id} has expired`);
  }
}

/**
 * Get approval status with multi-role tracking
 */
export async function getApprovalStatusWithRoles(approvalId: number): Promise<{
  approval: any;
  roleApprovals: any[];
  allRolesApproved: boolean;
  pendingRoles: string[];
}> {
  // Placeholder implementation
  return {
    approval: { id: approvalId, status: "PENDING" },
    roleApprovals: [],
    allRolesApproved: false,
    pendingRoles: [],
  };
}

/**
 * Approve an approval with role-based sign-off
 */
export async function approveApprovalWithRole(
  approvalId: number,
  role: string,
  userId: number
): Promise<{ success: boolean; allRolesApproved: boolean }> {
  // Placeholder implementation
  return { success: true, allRolesApproved: true };
}

/**
 * Reject an approval
 */
export async function rejectApproval(
  approvalId: number,
  reason: string,
  userId: number
): Promise<{ success: boolean }> {
  // Placeholder implementation
  return { success: true };
}
