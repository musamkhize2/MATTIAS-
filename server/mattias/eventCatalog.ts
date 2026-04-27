// MATTIAS Semantic Event Catalog
// These are the canonical business facts that flow through the system.

export const EventTypes = {
  // ─── Sales ──────────────────────────────────────────────────────────────────
  LEAD_CAPTURED: "LeadCaptured",
  LEAD_QUALIFIED: "LeadQualified",
  LEAD_DISQUALIFIED: "LeadDisqualified",
  FOLLOW_UP_SCHEDULED: "FollowUpScheduled",
  DEAL_STAGE_ADVANCED: "DealStageAdvanced",
  DEAL_WON: "DealWon",
  DEAL_LOST: "DealLost",
  PROPOSAL_SENT: "ProposalSent",

  // ─── Finance ────────────────────────────────────────────────────────────────
  PAYMENT_APPROVED: "PaymentApproved",
  PAYMENT_EXECUTED: "PaymentExecuted",
  PAYMENT_FAILED: "PaymentFailed",
  INVOICE_ISSUED: "InvoiceIssued",
  CASHFLOW_SHORTFALL_DETECTED: "CashflowShortfallDetected",
  BUDGET_EXCEEDED: "BudgetExceeded",
  EXPENSE_CATEGORIZED: "ExpenseCategorized",
  INVESTMENT_OPPORTUNITY_FLAGGED: "InvestmentOpportunityFlagged",

  // ─── Operations ─────────────────────────────────────────────────────────────
  TASK_CREATED: "TaskCreated",
  TASK_COMPLETED: "TaskCompleted",
  WORKFLOW_INITIATED: "WorkflowInitiated",
  WORKFLOW_STEP_COMPLETED: "WorkflowStepCompleted",
  SOP_EXECUTED: "SopExecuted",
  STAFF_ALERT_SENT: "StaffAlertSent",

  // ─── Communication ──────────────────────────────────────────────────────────
  EMAIL_DISPATCHED: "EmailDispatched",
  WHATSAPP_MESSAGE_RECEIVED: "WhatsAppMessageReceived",
  WHATSAPP_MESSAGE_SENT: "WhatsAppMessageSent",
  CALL_SUMMARY_CREATED: "CallSummaryCreated",
  AUTO_RESPONSE_SENT: "AutoResponseSent",

  // ─── Marketing ──────────────────────────────────────────────────────────────
  CAMPAIGN_LAUNCHED: "CampaignLaunched",
  AD_PERFORMANCE_ALERT: "AdPerformanceAlert",
  CONTENT_SUGGESTION_GENERATED: "ContentSuggestionGenerated",
  FUNNEL_DROP_DETECTED: "FunnelDropDetected",

  // ─── Knowledge ──────────────────────────────────────────────────────────────
  KNOWLEDGE_ITEM_STORED: "KnowledgeItemStored",
  INSIGHT_GENERATED: "InsightGenerated",
  KNOWLEDGE_GRAPH_UPDATED: "KnowledgeGraphUpdated",

  // ─── Personal Life ──────────────────────────────────────────────────────────
  HABIT_TRACKED: "HabitTracked",
  GOAL_MILESTONE_REACHED: "GoalMilestoneReached",
  HEALTH_METRIC_LOGGED: "HealthMetricLogged",
  SCHEDULE_CONFLICT_DETECTED: "ScheduleConflictDetected",

  // ─── Compliance & Risk ──────────────────────────────────────────────────────
  CONTRACT_RISK_FLAGGED: "ContractRiskFlagged",
  COMPLIANCE_DEADLINE_APPROACHING: "ComplianceDeadlineApproaching",
  LEGAL_OBLIGATION_LOGGED: "LegalObligationLogged",
  RISK_THRESHOLD_EXCEEDED: "RiskThresholdExceeded",

  // ─── System ─────────────────────────────────────────────────────────────────
  DEBATE_STARTED: "DebateStarted",
  DEBATE_OPINION_SUBMITTED: "DebateOpinionSubmitted",
  DEBATE_CONSENSUS_REACHED: "DebateConsensusReached",
  ACTION_APPROVED: "ActionApproved",
  ACTION_REJECTED: "ActionRejected",
  ACTION_EXECUTED: "ActionExecuted",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface SemanticEvent<T = Record<string, unknown>> {
  eventType: EventType | string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: string;
  data: T;
  metadata: {
    tenantId: number;
    userId?: number;
    causationId?: number;
    correlationId?: string;
    source?: "agent" | "user" | "integration" | "system";
  };
}

export const AGENT_NAMES = {
  OPERATIONS: "OperationsAgent",
  FINANCE: "FinanceAgent",
  SALES: "SalesAgent",
  MARKETING: "MarketingAgent",
  KNOWLEDGE: "KnowledgeAgent",
  PERSONAL_LIFE: "PersonalLifeAgent",
  COMMUNICATION: "CommunicationAgent",
  COMPLIANCE_RISK: "ComplianceRiskAgent",
  CRITIC: "CriticAgent",
} as const;

export type AgentName = (typeof AGENT_NAMES)[keyof typeof AGENT_NAMES];

export const AUTONOMY_LEVELS = {
  MANUAL: "manual",
  ASSISTED: "assisted",
  APPROVAL_GUARDED: "approval_guarded",
  AUTONOMOUS: "autonomous",
} as const;

export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[keyof typeof AUTONOMY_LEVELS];

export const SUBSCRIPTION_TIERS = {
  PERSONAL: "personal",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;

// Maps which agents are available per tier
export const TIER_AGENTS: Record<string, string[]> = {
  personal: [AGENT_NAMES.OPERATIONS, AGENT_NAMES.FINANCE, AGENT_NAMES.SALES],
  professional: Object.values(AGENT_NAMES).filter((a) => a !== AGENT_NAMES.CRITIC),
  enterprise: Object.values(AGENT_NAMES),
};

// Maps which event types each agent handles
export const AGENT_EVENT_MAP: Record<string, string[]> = {
  [AGENT_NAMES.SALES]: [
    EventTypes.LEAD_CAPTURED,
    EventTypes.LEAD_QUALIFIED,
    EventTypes.DEAL_STAGE_ADVANCED,
    EventTypes.FOLLOW_UP_SCHEDULED,
    EventTypes.PROPOSAL_SENT,
  ],
  [AGENT_NAMES.FINANCE]: [
    EventTypes.PAYMENT_APPROVED,
    EventTypes.CASHFLOW_SHORTFALL_DETECTED,
    EventTypes.BUDGET_EXCEEDED,
    EventTypes.INVOICE_ISSUED,
    EventTypes.EXPENSE_CATEGORIZED,
  ],
  [AGENT_NAMES.OPERATIONS]: [
    EventTypes.TASK_CREATED,
    EventTypes.WORKFLOW_INITIATED,
    EventTypes.SOP_EXECUTED,
    EventTypes.TASK_COMPLETED,
  ],
  [AGENT_NAMES.MARKETING]: [
    EventTypes.CAMPAIGN_LAUNCHED,
    EventTypes.AD_PERFORMANCE_ALERT,
    EventTypes.FUNNEL_DROP_DETECTED,
  ],
  [AGENT_NAMES.KNOWLEDGE]: [
    EventTypes.KNOWLEDGE_ITEM_STORED,
    EventTypes.INSIGHT_GENERATED,
  ],
  [AGENT_NAMES.PERSONAL_LIFE]: [
    EventTypes.HABIT_TRACKED,
    EventTypes.GOAL_MILESTONE_REACHED,
    EventTypes.SCHEDULE_CONFLICT_DETECTED,
  ],
  [AGENT_NAMES.COMMUNICATION]: [
    EventTypes.WHATSAPP_MESSAGE_RECEIVED,
    EventTypes.EMAIL_DISPATCHED,
    EventTypes.CALL_SUMMARY_CREATED,
  ],
  [AGENT_NAMES.COMPLIANCE_RISK]: [
    EventTypes.CONTRACT_RISK_FLAGGED,
    EventTypes.COMPLIANCE_DEADLINE_APPROACHING,
    EventTypes.RISK_THRESHOLD_EXCEEDED,
  ],
};
