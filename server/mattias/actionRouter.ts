import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  executeAction,
  batchExecuteActions,
  createEmailCampaignAction,
  createCRMAction,
  createTaskAction,
  getActionStatus,
  ActionType,
  Action,
} from "./actionExecutor";
import { sendEmail } from "./emailService";

/**
 * Action Router - tRPC procedures for executing and managing business actions
 */

export const actionRouter = router({
  /**
   * Execute a single action
   */
  executeAction: publicProcedure.input(
    z.object({
      type: z.enum([
        ActionType.SEND_EMAIL,
        ActionType.UPDATE_CRM,
        ActionType.CREATE_TASK,
        ActionType.SCHEDULE_MEETING,
        ActionType.GENERATE_REPORT,
        ActionType.SYNC_DATA,
        ActionType.TRIGGER_WORKFLOW,
      ]),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      payload: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const action: Action = {
        id: `action_${Date.now()}`,
        type: input.type as ActionType,
        status: "pending",
        priority: input.priority || "medium",
        payload: input.payload,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await executeAction(action);
      return {
        success: result.status === "completed",
        action: result,
        status: result.status,
        error: result.error,
        result: result.result,
      };
    }),

  /**
   * Send email campaign
   */
  sendEmailCampaign: publicProcedure.input(
    z.object({
      recipients: z.array(
        z.object({
          email: z.string().email(),
          name: z.string(),
          variables: z.record(z.string(), z.string()).optional(),
        })
      ),
      templateId: z.string(),
      senderEmail: z.string().email(),
      senderName: z.string(),
      delayMs: z.number().optional(),
    })
  ).mutation(async ({ input }) => {
      const formattedRecipients = input.recipients.map((r) => ({
        email: r.email,
        name: r.name,
        variables: r.variables || {},
      }));

      const action = createEmailCampaignAction(
        formattedRecipients,
        input.templateId,
        input.senderEmail,
        input.senderName
      );

      if (input.delayMs) {
        action.payload.delayMs = input.delayMs;
      }

      const result = await executeAction(action);

      return {
        success: result.status === "completed",
        actionId: result.id,
        recipientCount: input.recipients.length,
        status: result.status,
        error: result.error,
      };
    }),

  /**
   * Create CRM contact or deal
   */
  createCRMRecord: publicProcedure.input(
    z.object({
      crmType: z.enum(["salesforce", "hubspot", "pipedrive"]),
      operation: z.enum(["create_contact", "update_contact", "create_deal", "update_deal"]),
      data: z.record(z.string(), z.any()),
    })
  ).mutation(async ({ input }) => {
      const action = createCRMAction(input.crmType, input.operation, input.data);
      const result = await executeAction(action);

      return {
        success: result.status === "completed",
        actionId: result.id,
        recordId: result.result?.recordId,
        status: result.status,
        error: result.error,
      };
    }),

  /**
   * Create a task
   */
  createTask: publicProcedure.input(
    z.object({
      title: z.string(),
      description: z.string(),
      assignee: z.string(),
      dueDate: z.date(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    })
  ).mutation(async ({ input }) => {
      const action = createTaskAction(
        input.title,
        input.description,
        input.assignee,
        input.dueDate,
        input.priority || "medium"
      );

      const result = await executeAction(action);

      return {
        success: result.status === "completed",
        actionId: result.id,
        taskId: result.result?.taskId,
        status: result.status,
        error: result.error,
      };
    }),

  /**
   * Execute batch actions
   */
  batchExecute: publicProcedure.input(
    z.array(
      z.object({
        type: z.string(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        payload: z.record(z.string(), z.any()),
      })
    )
  ).mutation(async ({ input }) => {
      const actions: Action[] = input.map((item) => ({
        id: `action_${Date.now()}_${Math.random()}`,
        type: item.type as ActionType,
        status: "pending" as const,
        priority: item.priority || "medium",
        payload: item.payload,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      }));

      const results = await batchExecuteActions(actions);

      return {
        totalActions: results.length,
        successCount: results.filter((r) => r.status === "completed").length,
        failureCount: results.filter((r) => r.status === "failed").length,
        pendingCount: results.filter((r) => r.status === "pending").length,
        actions: results.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          error: r.error,
          result: r.result,
        })),
      };
    }),

  /**
   * Get action status
   */
  getStatus: publicProcedure.input(
    z.object({
      actionId: z.string(),
      type: z.string(),
    })
  ).query(async ({ input }) => {
      // In a real implementation, this would fetch from a database
      // For now, return a mock status
      const mockAction: Action = {
        id: input.actionId,
        type: input.type as ActionType,
        status: "completed",
        priority: "high",
        payload: {},
        createdAt: new Date(),
        executedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        result: { success: true },
      };

      const status = getActionStatus(mockAction);

      return {
        actionId: input.actionId,
        status: mockAction.status,
        statusText: status,
      };
    }),

  /**
   * Send test email
   */
  sendTestEmail: publicProcedure.input(
    z.object({
      email: z.string().email(),
      templateId: z.string(),
      senderEmail: z.string().email(),
      senderName: z.string(),
    })
  ).mutation(async ({ input }) => {
    try {
      const result = await sendEmail(
        { email: input.email, name: "Test User", variables: {} },
        input.templateId,
        input.senderEmail,
        input.senderName
      );

      return {
        success: result.success,
        messageId: result.messageId,
        email: input.email,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        email: input.email,
      };
    }
  }),

  /**
   * Get action history (mock)
   */
  getHistory: publicProcedure.input(
    z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
    })
  ).query(async ({ input }) => {
    const limit = input.limit || 10;
    const offset = input.offset || 0;

    const mockActions: Action[] = [
      {
        id: "action_1",
        type: ActionType.SEND_EMAIL,
        status: "completed",
        priority: "high",
        payload: { recipients: 100 },
        createdAt: new Date(Date.now() - 3600000),
        executedAt: new Date(Date.now() - 3500000),
        retryCount: 0,
        maxRetries: 3,
        result: { recipientCount: 100, successCount: 98 },
      },
      {
        id: "action_2",
        type: ActionType.UPDATE_CRM,
        status: "completed",
        priority: "medium",
        payload: { operation: "create_contact" },
        createdAt: new Date(Date.now() - 7200000),
        executedAt: new Date(Date.now() - 7100000),
        retryCount: 0,
        maxRetries: 3,
        result: { recordId: "crm_123" },
      },
    ];

    return {
      total: mockActions.length,
      limit,
      offset,
      actions: mockActions.slice(offset, offset + limit),
    };
  }),
});
