import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeAction,
  createEmailCampaignAction,
  createCRMAction,
  createTaskAction,
  batchExecuteActions,
  getActionStatus,
  ActionType,
  Action,
} from "./actionExecutor";
import * as emailService from "./emailService";

// Mock the email service
vi.mock("./emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: "msg_123",
  }),
}));

// Mock the LLM
vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "Generated report content",
        },
      },
    ],
  }),
}));

describe("Action Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEmailCampaignAction", () => {
    it("should create an email campaign action with correct structure", () => {
      const recipients = [{ email: "test@example.com", name: "Test User" }];
      const action = createEmailCampaignAction(recipients, "welcome", "sender@example.com", "Sender");

      expect(action.type).toBe(ActionType.SEND_EMAIL);
      expect(action.status).toBe("pending");
      expect(action.priority).toBe("high");
      expect(action.payload.recipients).toEqual(recipients);
      expect(action.payload.templateId).toBe("welcome");
      expect(action.payload.senderEmail).toBe("sender@example.com");
      expect(action.payload.senderName).toBe("Sender");
      expect(action.retryCount).toBe(0);
      expect(action.maxRetries).toBe(3);
    });

    it("should generate unique action IDs", async () => {
      const recipients = [{ email: "test@example.com", name: "Test" }];
      const action1 = createEmailCampaignAction(recipients, "welcome", "sender@example.com", "Sender");
      
      // Add delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const action2 = createEmailCampaignAction(recipients, "welcome", "sender@example.com", "Sender");

      expect(action1.id).not.toBe(action2.id);
    });
  });

  describe("createCRMAction", () => {
    it("should create a CRM action with correct structure", () => {
      const data = { email: "contact@example.com", firstName: "John" };
      const action = createCRMAction("hubspot", "create_contact", data);

      expect(action.type).toBe(ActionType.UPDATE_CRM);
      expect(action.status).toBe("pending");
      expect(action.payload.crmType).toBe("hubspot");
      expect(action.payload.operation).toBe("create_contact");
      expect(action.payload.data).toEqual(data);
      expect(action.retryCount).toBe(0);
      expect(action.maxRetries).toBe(3);
    });

    it("should support different CRM types", () => {
      const crmTypes = ["salesforce", "hubspot", "pipedrive"] as const;

      crmTypes.forEach((crmType) => {
        const action = createCRMAction(crmType, "create_contact", {});
        expect(action.payload.crmType).toBe(crmType);
      });
    });

    it("should support different CRM operations", () => {
      const operations = ["create_contact", "update_contact", "create_deal", "update_deal"] as const;

      operations.forEach((operation) => {
        const action = createCRMAction("hubspot", operation, {});
        expect(action.payload.operation).toBe(operation);
      });
    });
  });

  describe("createTaskAction", () => {
    it("should create a task action with correct structure", () => {
      const dueDate = new Date("2026-06-01");
      const action = createTaskAction("Complete report", "Finish Q2 report", "john@example.com", dueDate, "high");

      expect(action.type).toBe(ActionType.CREATE_TASK);
      expect(action.status).toBe("pending");
      expect(action.payload.title).toBe("Complete report");
      expect(action.payload.description).toBe("Finish Q2 report");
      expect(action.payload.assignee).toBe("john@example.com");
      expect(action.payload.dueDate).toEqual(dueDate);
      expect(action.payload.priority).toBe("high");
      expect(action.retryCount).toBe(0);
      expect(action.maxRetries).toBe(2);
    });

    it("should use default priority if not specified", () => {
      const action = createTaskAction("Task", "Description", "user@example.com", new Date());
      expect(action.payload.priority).toBe("medium");
    });
  });

  describe("executeAction", () => {
    it("should execute email action successfully", async () => {
      const recipients = [{ email: "test@example.com", name: "Test" }];
      const action = createEmailCampaignAction(recipients, "welcome", "sender@example.com", "Sender");

      const result = await executeAction(action);

      expect(result.status).toBe("completed");
      expect(result.result?.recipientCount).toBe(1);
      expect(result.result?.successCount).toBe(1);
      expect(result.executedAt).toBeDefined();
    });

    it("should execute CRM action successfully", async () => {
      const action = createCRMAction("hubspot", "create_contact", {
        email: "new@example.com",
        firstName: "Jane",
      });

      const result = await executeAction(action);

      expect(result.status).toBe("completed");
      expect(result.result?.crmType).toBe("hubspot");
      expect(result.result?.operation).toBe("create_contact");
      expect(result.result?.recordId).toBeDefined();
    });

    it("should execute task action successfully", async () => {
      const action = createTaskAction("Task", "Description", "user@example.com", new Date());

      const result = await executeAction(action);

      expect(result.status).toBe("completed");
      expect(result.result?.taskId).toBeDefined();
      expect(result.result?.title).toBe("Task");
    });

    it("should handle action execution errors", async () => {
      const action: Action = {
        id: "test_action",
        type: "invalid_type" as ActionType,
        status: "pending",
        priority: "high",
        payload: {},
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await executeAction(action);

      // On first failure with retries remaining, status should be pending (retryable)
      expect(result.status).toBe("pending");
      expect(result.error).toBeDefined();
      expect(result.retryCount).toBe(1);
    });

    it("should retry failed actions up to maxRetries", async () => {
      const action: Action = {
        id: "test_action",
        type: "invalid_type" as ActionType,
        status: "pending",
        priority: "high",
        payload: {},
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 2,
      };

      let result = await executeAction(action);
      expect(result.status).toBe("pending"); // Retryable (retryCount < maxRetries)
      expect(result.retryCount).toBe(1);

      result = await executeAction(result);
      expect(result.retryCount).toBe(2);
      expect(result.status).toBe("failed"); // Final failure after maxRetries reached
    });

    it("should set executedAt timestamp", async () => {
      const action = createEmailCampaignAction([{ email: "test@example.com", name: "Test" }], "welcome", "sender@example.com", "Sender");
      const beforeExecution = new Date();

      const result = await executeAction(action);

      expect(result.executedAt).toBeDefined();
      expect(result.executedAt!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
    });
  });

  describe("batchExecuteActions", () => {
    it("should execute multiple actions in sequence", async () => {
      const actions = [
        createEmailCampaignAction([{ email: "test1@example.com", name: "Test1" }], "welcome", "sender@example.com", "Sender"),
        createCRMAction("hubspot", "create_contact", { email: "test2@example.com" }),
        createTaskAction("Task", "Description", "user@example.com", new Date()),
      ];

      const results = await batchExecuteActions(actions);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe("completed");
      expect(results[1].status).toBe("completed");
      expect(results[2].status).toBe("completed");
    });

    it("should maintain action order", async () => {
      const actions = [
        createEmailCampaignAction([{ email: "test1@example.com", name: "Test1" }], "welcome", "sender@example.com", "Sender"),
        createCRMAction("hubspot", "create_contact", { email: "test2@example.com" }),
      ];

      const results = await batchExecuteActions(actions);

      expect(results[0].type).toBe(ActionType.SEND_EMAIL);
      expect(results[1].type).toBe(ActionType.UPDATE_CRM);
    });

    it("should handle mixed success and failure", async () => {
      const actions = [
        createEmailCampaignAction([{ email: "test1@example.com", name: "Test1" }], "welcome", "sender@example.com", "Sender"),
        {
          id: "invalid_action",
          type: "invalid_type" as ActionType,
          status: "pending" as const,
          priority: "high" as const,
          payload: {},
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: 1,
        },
      ];

      const results = await batchExecuteActions(actions);

      expect(results[0].status).toBe("completed");
      expect(results[1].status).toBe("failed");
    });
  });

  describe("getActionStatus", () => {
    it("should format action status as readable string", () => {
      const action = createEmailCampaignAction([{ email: "test@example.com", name: "Test" }], "welcome", "sender@example.com", "Sender");

      const status = getActionStatus(action);

      expect(status).toContain(`Action: ${action.id}`);
      expect(status).toContain(`Type: ${ActionType.SEND_EMAIL}`);
      expect(status).toContain("Status: pending");
      expect(status).toContain("Priority: high");
    });

    it("should include error message if action failed", async () => {
      const action: Action = {
        id: "failed_action",
        type: "invalid_type" as ActionType,
        status: "failed",
        priority: "high",
        payload: {},
        createdAt: new Date(),
        error: "Unknown action type",
        retryCount: 1,
        maxRetries: 3,
      };

      const status = getActionStatus(action);

      expect(status).toContain("Error: Unknown action type");
    });

    it("should include result if action completed", async () => {
      const action = createEmailCampaignAction([{ email: "test@example.com", name: "Test" }], "welcome", "sender@example.com", "Sender");
      action.status = "completed";
      action.result = { recipientCount: 1, successCount: 1 };

      const status = getActionStatus(action);

      expect(status).toContain("Result:");
    });

    it("should include execution timestamp if action was executed", () => {
      const action = createEmailCampaignAction([{ email: "test@example.com", name: "Test" }], "welcome", "sender@example.com", "Sender");
      action.executedAt = new Date();

      const status = getActionStatus(action);

      expect(status).toContain("Executed:");
    });
  });

  describe("Action Types", () => {
    it("should support all action types", () => {
      const types = [
        ActionType.SEND_EMAIL,
        ActionType.UPDATE_CRM,
        ActionType.CREATE_TASK,
        ActionType.SCHEDULE_MEETING,
        ActionType.GENERATE_REPORT,
        ActionType.SYNC_DATA,
        ActionType.TRIGGER_WORKFLOW,
      ];

      types.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });

  describe("Priority Levels", () => {
    it("should support all priority levels", () => {
      const priorities = ["low", "medium", "high", "critical"];

      priorities.forEach((priority) => {
        const action = createEmailCampaignAction([{ email: "test@example.com", name: "Test" }], "welcome", "sender@example.com", "Sender");
        action.priority = priority as any;
        expect(action.priority).toBe(priority);
      });
    });
  });

  describe("Status Transitions", () => {
    it("should transition from pending to executing to completed", async () => {
      const action = createEmailCampaignAction([{ email: "test@example.com", name: "Test" }], "welcome", "sender@example.com", "Sender");

      expect(action.status).toBe("pending");

      const result = await executeAction(action);

      expect(result.status).toBe("completed");
    });

    it("should transition to failed on error", async () => {
      const action: Action = {
        id: "test_action",
        type: "invalid_type" as ActionType,
        status: "pending",
        priority: "high",
        payload: {},
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 1,
      };

      let result = await executeAction(action);
      // First attempt with maxRetries=1: retryCount becomes 1, which equals maxRetries, so status is failed
      expect(result.status).toBe("failed");
      expect(result.retryCount).toBe(1);
    });
  });

  describe("Retry Logic", () => {
    it("should increment retry count on failure", async () => {
      const action: Action = {
        id: "test_action",
        type: "invalid_type" as ActionType,
        status: "pending",
        priority: "high",
        payload: {},
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await executeAction(action);

      expect(result.retryCount).toBe(1);
    });

    it("should respect maxRetries limit", async () => {
      const action: Action = {
        id: "test_action",
        type: "invalid_type" as ActionType,
        status: "pending",
        priority: "high",
        payload: {},
        createdAt: new Date(),
        retryCount: 2,
        maxRetries: 2,
      };

      const result = await executeAction(action);

      expect(result.retryCount).toBe(3);
      expect(result.status).toBe("failed");
    });
  });
});
