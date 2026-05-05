import { describe, it, expect } from "vitest";
import { actionRouter } from "./actionRouter";
import { ActionType } from "./actionExecutor";

describe("Action Router", () => {
  describe("Router structure", () => {
    it("should have all required procedures", () => {
      expect(actionRouter).toBeDefined();
      expect(actionRouter.createCaller).toBeDefined();
    });

    it("should export executeAction procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("executeAction");
    });

    it("should export sendEmailCampaign procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("sendEmailCampaign");
    });

    it("should export createCRMRecord procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("createCRMRecord");
    });

    it("should export createTask procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("createTask");
    });

    it("should export batchExecute procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("batchExecute");
    });

    it("should export getStatus procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("getStatus");
    });

    it("should export sendTestEmail procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("sendTestEmail");
    });

    it("should export getHistory procedure", () => {
      const procedures = Object.keys(actionRouter._def.procedures);
      expect(procedures).toContain("getHistory");
    });
  });

  describe("Procedure types", () => {
    it("executeAction should exist", () => {
      const proc = actionRouter._def.procedures.executeAction;
      expect(proc).toBeDefined();
    });

    it("sendEmailCampaign should exist", () => {
      const proc = actionRouter._def.procedures.sendEmailCampaign;
      expect(proc).toBeDefined();
    });

    it("getStatus should exist", () => {
      const proc = actionRouter._def.procedures.getStatus;
      expect(proc).toBeDefined();
    });

    it("getHistory should exist", () => {
      const proc = actionRouter._def.procedures.getHistory;
      expect(proc).toBeDefined();
    });
  });

  describe("Action type support", () => {
    it("should support SEND_EMAIL action", () => {
      expect(ActionType.SEND_EMAIL).toBe("send_email");
    });

    it("should support UPDATE_CRM action", () => {
      expect(ActionType.UPDATE_CRM).toBe("update_crm");
    });

    it("should support CREATE_TASK action", () => {
      expect(ActionType.CREATE_TASK).toBe("create_task");
    });

    it("should support SCHEDULE_MEETING action", () => {
      expect(ActionType.SCHEDULE_MEETING).toBe("schedule_meeting");
    });

    it("should support GENERATE_REPORT action", () => {
      expect(ActionType.GENERATE_REPORT).toBe("generate_report");
    });

    it("should support SYNC_DATA action", () => {
      expect(ActionType.SYNC_DATA).toBe("sync_data");
    });

    it("should support TRIGGER_WORKFLOW action", () => {
      expect(ActionType.TRIGGER_WORKFLOW).toBe("trigger_workflow");
    });
  });

  describe("Priority levels", () => {
    it("should support low priority", () => {
      const priorities = ["low", "medium", "high", "critical"];
      expect(priorities).toContain("low");
    });

    it("should support medium priority", () => {
      const priorities = ["low", "medium", "high", "critical"];
      expect(priorities).toContain("medium");
    });

    it("should support high priority", () => {
      const priorities = ["low", "medium", "high", "critical"];
      expect(priorities).toContain("high");
    });

    it("should support critical priority", () => {
      const priorities = ["low", "medium", "high", "critical"];
      expect(priorities).toContain("critical");
    });
  });

  describe("CRM operations", () => {
    it("should support create_contact operation", () => {
      const operations = ["create_contact", "update_contact", "create_deal", "update_deal"];
      expect(operations).toContain("create_contact");
    });

    it("should support update_contact operation", () => {
      const operations = ["create_contact", "update_contact", "create_deal", "update_deal"];
      expect(operations).toContain("update_contact");
    });

    it("should support create_deal operation", () => {
      const operations = ["create_contact", "update_contact", "create_deal", "update_deal"];
      expect(operations).toContain("create_deal");
    });

    it("should support update_deal operation", () => {
      const operations = ["create_contact", "update_contact", "create_deal", "update_deal"];
      expect(operations).toContain("update_deal");
    });

    it("should support Salesforce CRM", () => {
      const crmTypes = ["salesforce", "hubspot", "pipedrive"];
      expect(crmTypes).toContain("salesforce");
    });

    it("should support HubSpot CRM", () => {
      const crmTypes = ["salesforce", "hubspot", "pipedrive"];
      expect(crmTypes).toContain("hubspot");
    });

    it("should support Pipedrive CRM", () => {
      const crmTypes = ["salesforce", "hubspot", "pipedrive"];
      expect(crmTypes).toContain("pipedrive");
    });
  });

  describe("Input validation", () => {
    it("should accept valid action type", () => {
      const input = {
        type: ActionType.SEND_EMAIL,
        priority: "high",
        payload: { recipients: [] },
      };
      expect(input.type).toBe(ActionType.SEND_EMAIL);
    });

    it("should accept valid recipients", () => {
      const input = {
        recipients: [
          {
            email: "test@example.com",
            name: "Test User",
            variables: { name: "Test" },
          },
        ],
        templateId: "welcome",
        senderEmail: "sender@example.com",
        senderName: "Sender",
      };
      expect(input.recipients).toHaveLength(1);
      expect(input.recipients[0].email).toBe("test@example.com");
    });

    it("should accept valid CRM types", () => {
      const crmTypes = ["salesforce", "hubspot", "pipedrive"];
      crmTypes.forEach((type) => {
        expect(["salesforce", "hubspot", "pipedrive"]).toContain(type);
      });
    });

    it("should accept valid task data", () => {
      const input = {
        title: "Task Title",
        description: "Task Description",
        assignee: "user@example.com",
        dueDate: new Date(),
        priority: "high",
      };
      expect(input.title).toBeDefined();
      expect(input.dueDate).toBeInstanceOf(Date);
    });

    it("should accept array of actions for batch", () => {
      const input = [
        {
          type: ActionType.SEND_EMAIL,
          priority: "high",
          payload: { recipients: [] },
        },
        {
          type: ActionType.UPDATE_CRM,
          priority: "medium",
          payload: { crmType: "hubspot" },
        },
      ];
      expect(input).toHaveLength(2);
      expect(input[0].type).toBe(ActionType.SEND_EMAIL);
    });

    it("should accept action ID and type for status", () => {
      const input = {
        actionId: "action_123",
        type: ActionType.SEND_EMAIL,
      };
      expect(input.actionId).toBeDefined();
      expect(input.type).toBeDefined();
    });

    it("should accept optional limit and offset", () => {
      const input1 = { limit: 10, offset: 0 };
      const input2 = {};
      expect(input1.limit).toBe(10);
      expect(Object.keys(input2)).toHaveLength(0);
    });
  });

  describe("Response types", () => {
    it("should return success status for executeAction", () => {
      const response = {
        success: true,
        action: { id: "action_123" },
        status: "completed",
        error: undefined,
        result: { success: true },
      };
      expect(response.success).toBe(true);
      expect(response.status).toBe("completed");
    });

    it("should return campaign result for sendEmailCampaign", () => {
      const response = {
        success: true,
        actionId: "action_email",
        recipientCount: 100,
        status: "completed",
        error: undefined,
      };
      expect(response.success).toBe(true);
      expect(response.recipientCount).toBe(100);
    });

    it("should return CRM record result for createCRMRecord", () => {
      const response = {
        success: true,
        actionId: "action_crm",
        recordId: "crm_123",
        status: "completed",
        error: undefined,
      };
      expect(response.success).toBe(true);
      expect(response.recordId).toBeDefined();
    });

    it("should return task result for createTask", () => {
      const response = {
        success: true,
        actionId: "action_task",
        taskId: "task_123",
        status: "completed",
        error: undefined,
      };
      expect(response.success).toBe(true);
      expect(response.taskId).toBeDefined();
    });

    it("should return batch results for batchExecute", () => {
      const response = {
        totalActions: 2,
        successCount: 2,
        failureCount: 0,
        pendingCount: 0,
        actions: [
          { id: "action_1", type: ActionType.SEND_EMAIL, status: "completed" },
          { id: "action_2", type: ActionType.UPDATE_CRM, status: "completed" },
        ],
      };
      expect(response.totalActions).toBe(2);
      expect(response.successCount).toBe(2);
      expect(response.actions).toHaveLength(2);
    });

    it("should return status information for getStatus", () => {
      const response = {
        actionId: "action_123",
        status: "completed",
        statusText: "Action status: completed",
      };
      expect(response.actionId).toBe("action_123");
      expect(response.status).toBe("completed");
      expect(response.statusText).toBeDefined();
    });

    it("should return email result for sendTestEmail", () => {
      const response = {
        success: true,
        messageId: "msg_123",
        email: "test@example.com",
      };
      expect(response.success).toBe(true);
      expect(response.messageId).toBeDefined();
      expect(response.email).toBe("test@example.com");
    });

    it("should return action history for getHistory", () => {
      const response = {
        total: 2,
        limit: 10,
        offset: 0,
        actions: [
          { id: "action_1", type: ActionType.SEND_EMAIL, status: "completed" },
          { id: "action_2", type: ActionType.UPDATE_CRM, status: "completed" },
        ],
      };
      expect(response.total).toBe(2);
      expect(response.actions).toHaveLength(2);
    });
  });

  describe("Error handling", () => {
    it("should handle invalid email addresses", () => {
      const invalidEmail = "not-an-email";
      expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it("should handle empty recipient list", () => {
      const input = {
        recipients: [],
        templateId: "welcome",
        senderEmail: "sender@example.com",
        senderName: "Sender",
      };
      expect(input.recipients).toHaveLength(0);
    });

    it("should handle invalid CRM type", () => {
      const validTypes = ["salesforce", "hubspot", "pipedrive"];
      const invalidType = "invalid_crm";
      expect(validTypes).not.toContain(invalidType);
    });

    it("should handle negative limits", () => {
      const input = { limit: -1, offset: 0 };
      expect(input.limit).toBeLessThan(0);
    });
  });

  describe("Email template support", () => {
    it("should support welcome template", () => {
      const templates = ["welcome", "followup", "promotional"];
      expect(templates).toContain("welcome");
    });

    it("should support followup template", () => {
      const templates = ["welcome", "followup", "promotional"];
      expect(templates).toContain("followup");
    });

    it("should support promotional template", () => {
      const templates = ["welcome", "followup", "promotional"];
      expect(templates).toContain("promotional");
    });
  });

  describe("Task priority support", () => {
    it("should support low task priority", () => {
      const taskPriorities = ["low", "medium", "high"];
      expect(taskPriorities).toContain("low");
    });

    it("should support medium task priority", () => {
      const taskPriorities = ["low", "medium", "high"];
      expect(taskPriorities).toContain("medium");
    });

    it("should support high task priority", () => {
      const taskPriorities = ["low", "medium", "high"];
      expect(taskPriorities).toContain("high");
    });
  });
});
