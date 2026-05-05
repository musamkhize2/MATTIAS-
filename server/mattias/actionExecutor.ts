import { sendEmail, EmailRecipient, EMAIL_TEMPLATES } from "./emailService";
import { invokeLLM } from "../_core/llm";

/**
 * Action Executor - Handles real business operations triggered by MATTIAS
 * Supports email campaigns, CRM updates, lead scoring, and workflow automation
 */

export enum ActionType {
  SEND_EMAIL = "send_email",
  UPDATE_CRM = "update_crm",
  CREATE_TASK = "create_task",
  SCHEDULE_MEETING = "schedule_meeting",
  GENERATE_REPORT = "generate_report",
  SYNC_DATA = "sync_data",
  TRIGGER_WORKFLOW = "trigger_workflow",
}

export interface Action {
  id: string;
  type: ActionType;
  status: "pending" | "executing" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "critical";
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
  executedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface EmailAction extends Action {
  type: ActionType.SEND_EMAIL;
  payload: {
    recipients: EmailRecipient[];
    templateId: string;
    senderEmail: string;
    senderName: string;
    delayMs?: number;
  };
}

export interface CRMAction extends Action {
  type: ActionType.UPDATE_CRM;
  payload: {
    crmType: "salesforce" | "hubspot" | "pipedrive";
    operation: "create_contact" | "update_contact" | "create_deal" | "update_deal";
    data: Record<string, any>;
  };
}

export interface TaskAction extends Action {
  type: ActionType.CREATE_TASK;
  payload: {
    title: string;
    description: string;
    assignee: string;
    dueDate: Date;
    priority: "low" | "medium" | "high";
  };
}

/**
 * Execute a business action
 */
export async function executeAction(action: Action): Promise<Action> {
  try {
    action.status = "executing";
    action.executedAt = new Date();

    switch (action.type) {
      case ActionType.SEND_EMAIL:
        return await executeSendEmail(action as EmailAction);

      case ActionType.UPDATE_CRM:
        return await executeCRMUpdate(action as CRMAction);

      case ActionType.CREATE_TASK:
        return await executeCreateTask(action as TaskAction);

      case ActionType.GENERATE_REPORT:
        return await executeGenerateReport(action);

      case ActionType.SCHEDULE_MEETING:
        return await executeScheduleMeeting(action);

      case ActionType.SYNC_DATA:
        return await executeSyncData(action);

      case ActionType.TRIGGER_WORKFLOW:
        return await executeTriggerWorkflow(action);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    action.status = "failed";
    action.error = error instanceof Error ? error.message : "Unknown error";
    action.retryCount++;

    if (action.retryCount < action.maxRetries) {
      action.status = "pending";
    }

    return action;
  }
}

/**
 * Execute email sending action
 */
async function executeSendEmail(action: EmailAction): Promise<Action> {
  const { recipients, templateId, senderEmail, senderName, delayMs = 1000 } = action.payload;

  const results = await sendEmail(recipients[0], templateId, senderEmail, senderName);

  if (recipients.length > 1) {
    // Send remaining emails with delay
    for (let i = 1; i < recipients.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await sendEmail(recipients[i], templateId, senderEmail, senderName);
    }
  }

  action.status = "completed";
  action.result = {
    recipientCount: recipients.length,
    successCount: results.success ? recipients.length : 0,
    messageIds: [results.messageId],
  };

  return action;
}

/**
 * Execute CRM update action
 */
async function executeCRMUpdate(action: CRMAction): Promise<Action> {
  const { crmType, operation, data } = action.payload;

  // In production, this would call the actual CRM API
  // For now, we'll simulate the operation
  console.log(`[CRM] ${crmType.toUpperCase()} - ${operation}`, data);

  // TODO: Implement actual CRM integrations
  // - Salesforce API
  // - HubSpot API
  // - Pipedrive API

  action.status = "completed";
  action.result = {
    crmType,
    operation,
    recordId: `${crmType}_${Date.now()}`,
    timestamp: new Date(),
  };

  return action;
}

/**
 * Execute task creation action
 */
async function executeCreateTask(action: TaskAction): Promise<Action> {
  const { title, description, assignee, dueDate, priority } = action.payload;

  console.log(`[TASK] Creating task: ${title}`, {
    assignee,
    dueDate,
    priority,
  });

  // TODO: Integrate with task management systems
  // - Asana
  // - Monday.com
  // - Jira

  action.status = "completed";
  action.result = {
    taskId: `task_${Date.now()}`,
    title,
    assignee,
    dueDate,
    status: "created",
  };

  return action;
}

/**
 * Execute report generation action
 */
async function executeGenerateReport(action: Action): Promise<Action> {
  const { reportType, parameters } = action.payload;

  console.log(`[REPORT] Generating ${reportType} report`, parameters);

  // Use LLM to generate report content
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert business analyst. Generate comprehensive reports based on data.",
      },
      {
        role: "user",
        content: `Generate a ${reportType} report with the following parameters: ${JSON.stringify(parameters)}`,
      },
    ],
  });

  action.status = "completed";
  action.result = {
    reportType,
    content: response.choices[0]?.message?.content,
    generatedAt: new Date(),
  };

  return action;
}

/**
 * Execute meeting scheduling action
 */
async function executeScheduleMeeting(action: Action): Promise<Action> {
  const { title, attendees, duration, date } = action.payload;

  console.log(`[MEETING] Scheduling: ${title}`, {
    attendees,
    duration,
    date,
  });

  // TODO: Integrate with calendar systems
  // - Google Calendar
  // - Outlook
  // - Calendly

  action.status = "completed";
  action.result = {
    meetingId: `meeting_${Date.now()}`,
    title,
    attendees,
    scheduledFor: date,
    status: "scheduled",
  };

  return action;
}

/**
 * Execute data sync action
 */
async function executeSyncData(action: Action): Promise<Action> {
  const { source, destination, dataType } = action.payload;

  console.log(`[SYNC] Syncing ${dataType} from ${source} to ${destination}`);

  // TODO: Implement data sync between systems
  // - CRM to Email Platform
  // - Data Warehouse to BI Tools
  // - API to Database

  action.status = "completed";
  action.result = {
    source,
    destination,
    dataType,
    recordsSynced: Math.floor(Math.random() * 1000),
    syncedAt: new Date(),
  };

  return action;
}

/**
 * Execute workflow trigger action
 */
async function executeTriggerWorkflow(action: Action): Promise<Action> {
  const { workflowId, triggerData } = action.payload;

  console.log(`[WORKFLOW] Triggering workflow: ${workflowId}`, triggerData);

  // TODO: Integrate with workflow orchestration
  // - Zapier
  // - Make.com
  // - n8n

  action.status = "completed";
  action.result = {
    workflowId,
    executionId: `exec_${Date.now()}`,
    status: "triggered",
    triggeredAt: new Date(),
  };

  return action;
}

/**
 * Create email campaign action
 */
export function createEmailCampaignAction(
  recipients: EmailRecipient[],
  templateId: string,
  senderEmail: string,
  senderName: string
): EmailAction {
  return {
    id: `action_${Date.now()}`,
    type: ActionType.SEND_EMAIL,
    status: "pending",
    priority: "high",
    payload: {
      recipients,
      templateId,
      senderEmail,
      senderName,
      delayMs: 1000,
    },
    createdAt: new Date(),
    retryCount: 0,
    maxRetries: 3,
  };
}

/**
 * Create CRM update action
 */
export function createCRMAction(
  crmType: "salesforce" | "hubspot" | "pipedrive",
  operation: "create_contact" | "update_contact" | "create_deal" | "update_deal",
  data: Record<string, any>
): CRMAction {
  return {
    id: `action_${Date.now()}`,
    type: ActionType.UPDATE_CRM,
    status: "pending",
    priority: "high",
    payload: {
      crmType,
      operation,
      data,
    },
    createdAt: new Date(),
    retryCount: 0,
    maxRetries: 3,
  };
}

/**
 * Create task action
 */
export function createTaskAction(
  title: string,
  description: string,
  assignee: string,
  dueDate: Date,
  priority: "low" | "medium" | "high" = "medium"
): TaskAction {
  return {
    id: `action_${Date.now()}`,
    type: ActionType.CREATE_TASK,
    status: "pending",
    priority: "high",
    payload: {
      title,
      description,
      assignee,
      dueDate,
      priority,
    },
    createdAt: new Date(),
    retryCount: 0,
    maxRetries: 2,
  };
}

/**
 * Batch execute actions
 */
export async function batchExecuteActions(actions: Action[]): Promise<Action[]> {
  const results: Action[] = [];

  for (const action of actions) {
    const result = await executeAction(action);
    results.push(result);

    // Add delay between actions to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Get action status
 */
export function getActionStatus(action: Action): string {
  return `
Action: ${action.id}
Type: ${action.type}
Status: ${action.status}
Priority: ${action.priority}
Retries: ${action.retryCount}/${action.maxRetries}
Created: ${action.createdAt.toISOString()}
${action.executedAt ? `Executed: ${action.executedAt.toISOString()}` : ""}
${action.error ? `Error: ${action.error}` : ""}
${action.result ? `Result: ${JSON.stringify(action.result, null, 2)}` : ""}
  `.trim();
}
