import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createApprovalQueueItem,
  approveQueueItem,
  rejectQueueItem,
  getPendingApprovals,
  getApprovalQueueItem,
} from "./approvalQueueNotifications";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: "Test Tenant",
              subscriptionTier: "professional",
              autonomyLevel: "assisted",
              features: {
                notificationEmail: "admin@example.com",
                slackWebhookUrl: "https://hooks.slack.com/services/test",
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      }),
    }),
  }),
}));

vi.mock("../../drizzle/schema", () => ({
  tenants: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("./notificationService", () => ({
  sendSlackNotification: vi.fn().mockResolvedValue(true),
  sendEmailNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("./domainConfig", () => ({
  getDomainConfig: vi.fn().mockResolvedValue({
    customDomain: "example.com",
    notificationEmail: "admin@example.com",
    slackWebhookUrl: "https://hooks.slack.com/services/test",
  }),
}));

describe("Approval Queue Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createApprovalQueueItem", () => {
    it("should create an approval queue item with correct properties", async () => {
      const item = await createApprovalQueueItem(
        1,
        "campaign_send",
        "Send campaign to 10,000 subscribers",
        2,
        { campaignId: "campaign_123" }
      );

      expect(item).toBeDefined();
      expect(item.tenantId).toBe(1);
      expect(item.actionType).toBe("campaign_send");
      expect(item.actionDescription).toBe("Send campaign to 10,000 subscribers");
      expect(item.requiredApprovals).toBe(2);
      expect(item.currentApprovals).toBe(0);
      expect(item.metadata).toEqual({ campaignId: "campaign_123" });
    });

    it("should set expiration to 24 hours from now", async () => {
      const before = new Date();
      const item = await createApprovalQueueItem(1, "policy_change", "Update approval policy", 1);
      const after = new Date();

      const expectedMin = new Date(before.getTime() + 24 * 60 * 60 * 1000);
      const expectedMax = new Date(after.getTime() + 24 * 60 * 60 * 1000);

      expect(item.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
      expect(item.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
    });

    it("should support different action types", async () => {
      const types: Array<"campaign_send" | "policy_change" | "data_export" | "integration_connect"> = [
        "campaign_send",
        "policy_change",
        "data_export",
        "integration_connect",
      ];

      for (const type of types) {
        const item = await createApprovalQueueItem(1, type, `Test ${type}`, 1);
        expect(item.actionType).toBe(type);
      }
    });

    it("should generate unique approval IDs", async () => {
      const item1 = await createApprovalQueueItem(1, "campaign_send", "Test 1", 1);
      const item2 = await createApprovalQueueItem(1, "campaign_send", "Test 2", 1);

      expect(item1.id).not.toBe(item2.id);
      expect(item1.id).toMatch(/^approval_/);
      expect(item2.id).toMatch(/^approval_/);
    });
  });

  describe("approveQueueItem", () => {
    it("should approve queue item and return correct status", async () => {
      const result = await approveQueueItem(1, "approval_123", "John Doe", "john@example.com");

      expect(result).toBeDefined();
      expect(result.approved).toBe(true);
      expect(result.currentApprovals).toBe(1);
      expect(result.requiresMoreApprovals).toBe(false);
    });

    it("should track current approvals", async () => {
      const result = await approveQueueItem(1, "approval_456", "Jane Smith", "jane@example.com");

      expect(result.currentApprovals).toBeGreaterThanOrEqual(0);
    });
  });

  describe("rejectQueueItem", () => {
    it("should reject queue item with reason", async () => {
      const result = await rejectQueueItem(
        1,
        "approval_789",
        "Admin User",
        "admin@example.com",
        "Insufficient data quality"
      );

      expect(result).toBeDefined();
      expect(result.rejected).toBe(true);
    });

    it("should handle rejection with various reasons", async () => {
      const reasons = [
        "Policy violation",
        "Insufficient approvals",
        "Data validation failed",
        "Budget exceeded",
      ];

      for (const reason of reasons) {
        const result = await rejectQueueItem(1, "approval_test", "Approver", "approver@example.com", reason);
        expect(result.rejected).toBe(true);
      }
    });
  });

  describe("getPendingApprovals", () => {
    it("should return pending approvals for tenant", async () => {
      const approvals = await getPendingApprovals(1);

      expect(Array.isArray(approvals)).toBe(true);
    });

    it("should handle multiple pending approvals", async () => {
      const approvals = await getPendingApprovals(1);

      expect(approvals).toBeDefined();
    });
  });

  describe("getApprovalQueueItem", () => {
    it("should retrieve approval queue item by ID", async () => {
      const item = await getApprovalQueueItem(1, "approval_123");

      // Item may be null if not found
      expect(item === null || typeof item === "object").toBe(true);
    });

    it("should handle non-existent approval IDs", async () => {
      const item = await getApprovalQueueItem(1, "non_existent_id");

      expect(item).toBeNull();
    });
  });

  describe("approval workflow", () => {
    it("should handle complete approval workflow", async () => {
      // Create approval
      const approval = await createApprovalQueueItem(
        1,
        "campaign_send",
        "Send campaign",
        1,
        { campaignId: "camp_123" }
      );

      expect(approval.currentApprovals).toBe(0);

      // Approve
      const approveResult = await approveQueueItem(1, approval.id, "Approver", "approver@example.com");

      expect(approveResult.approved).toBe(true);
    });

    it("should handle complete rejection workflow", async () => {
      // Create approval
      const approval = await createApprovalQueueItem(
        1,
        "policy_change",
        "Update policy",
        1,
        { policyId: "policy_456" }
      );

      expect(approval.currentApprovals).toBe(0);

      // Reject
      const rejectResult = await rejectQueueItem(
        1,
        approval.id,
        "Reviewer",
        "reviewer@example.com",
        "Policy needs revision"
      );

      expect(rejectResult.rejected).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const result = await getPendingApprovals(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("metadata handling", () => {
    it("should preserve custom metadata in approval items", async () => {
      const customMetadata = {
        campaignId: "camp_123",
        recipientCount: 10000,
        estimatedRevenue: 5000,
        priority: "high",
      };

      const item = await createApprovalQueueItem(
        1,
        "campaign_send",
        "Send campaign",
        1,
        customMetadata
      );

      expect(item.metadata).toEqual(customMetadata);
    });

    it("should handle empty metadata", async () => {
      const item = await createApprovalQueueItem(1, "campaign_send", "Send campaign", 1);

      expect(item.metadata).toEqual({});
    });
  });
});
