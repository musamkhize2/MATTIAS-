import { trpc } from "@/lib/trpc";
import {
  Activity,
  BookOpen,
  Brain,
  CheckCircle,
  Heart,
  Layers,
  MessageSquare,
  Scale,
  Shield,
  ShoppingCart,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AGENT_META: Record<
  string,
  {
    name: string;
    icon: React.ElementType;
    color: string;
    description: string;
    capabilities: string[];
    handledEvents: string[];
  }
> = {
  operations: {
    name: "OperationsAgent",
    icon: Layers,
    color: "oklch(0.72 0.18 200)",
    description:
      "Manages task execution, workflow orchestration, and standard operating procedures. Ensures smooth operational delivery across all business functions.",
    capabilities: [
      "Task creation and assignment",
      "Workflow initiation and step tracking",
      "SOP execution and monitoring",
      "Staff alert dispatching",
      "Operational bottleneck detection",
    ],
    handledEvents: ["TaskCreated", "TaskCompleted", "WorkflowInitiated", "SopExecuted"],
  },
  finance: {
    name: "FinanceAgent",
    icon: TrendingUp,
    color: "oklch(0.68 0.2 145)",
    description:
      "Monitors cash flow, enforces budget controls, categorizes expenses, and flags financial risks before they become critical.",
    capabilities: [
      "Cash flow projection and monitoring",
      "Budget enforcement and alerts",
      "Expense categorization",
      "Invoice management",
      "Investment opportunity flagging",
    ],
    handledEvents: [
      "PaymentApproved",
      "CashflowShortfallDetected",
      "BudgetExceeded",
      "InvoiceIssued",
      "ExpenseCategorized",
    ],
  },
  sales: {
    name: "SalesAgent",
    icon: ShoppingCart,
    color: "oklch(0.65 0.22 270)",
    description:
      "Manages the full sales pipeline — from lead capture to deal close. Prioritizes opportunities, schedules follow-ups, and maximizes conversion.",
    capabilities: [
      "Lead qualification and scoring",
      "Deal stage advancement",
      "Follow-up scheduling",
      "Proposal generation",
      "Pipeline prioritization",
    ],
    handledEvents: [
      "LeadCaptured",
      "LeadQualified",
      "DealStageAdvanced",
      "FollowUpScheduled",
      "ProposalSent",
    ],
  },
  marketing: {
    name: "MarketingAgent",
    icon: Zap,
    color: "oklch(0.75 0.18 75)",
    description:
      "Optimizes marketing campaigns, monitors ad performance, generates content suggestions, and detects funnel drop-off points.",
    capabilities: [
      "Campaign performance monitoring",
      "Ad spend optimization",
      "Content suggestion generation",
      "Funnel analysis",
      "Growth opportunity identification",
    ],
    handledEvents: ["CampaignLaunched", "AdPerformanceAlert", "FunnelDropDetected"],
  },
  knowledge: {
    name: "KnowledgeAgent",
    icon: BookOpen,
    color: "oklch(0.62 0.22 300)",
    description:
      "Organizes, connects, and surfaces knowledge across your business. Generates insights from stored information and maintains the knowledge graph.",
    capabilities: [
      "Knowledge item storage and retrieval",
      "Insight generation",
      "Knowledge graph maintenance",
      "Semantic search",
      "Pattern recognition across data",
    ],
    handledEvents: ["KnowledgeItemStored", "InsightGenerated"],
  },
  "personal-life": {
    name: "PersonalLifeAgent",
    icon: Heart,
    color: "oklch(0.7 0.2 170)",
    description:
      "Tracks habits, monitors health metrics, manages personal goals, and detects schedule conflicts to optimize your personal life.",
    capabilities: [
      "Habit tracking and streaks",
      "Health metric logging",
      "Goal milestone tracking",
      "Schedule conflict detection",
      "Personal productivity optimization",
    ],
    handledEvents: ["HabitTracked", "GoalMilestoneReached", "ScheduleConflictDetected"],
  },
  communication: {
    name: "CommunicationAgent",
    icon: MessageSquare,
    color: "oklch(0.72 0.18 200)",
    description:
      "Handles email, WhatsApp, and call management. Auto-responds to routine messages, summarizes calls, and ensures no communication falls through the cracks.",
    capabilities: [
      "Email dispatch and monitoring",
      "WhatsApp message handling",
      "Call summary creation",
      "Auto-response generation",
      "Communication workflow automation",
    ],
    handledEvents: ["WhatsAppMessageReceived", "EmailDispatched", "CallSummaryCreated"],
  },
  "compliance-risk": {
    name: "ComplianceRiskAgent",
    icon: Shield,
    color: "oklch(0.6 0.22 25)",
    description:
      "Flags contract risks, tracks legal obligations, monitors compliance deadlines, and ensures your business stays within regulatory boundaries.",
    capabilities: [
      "Contract risk analysis",
      "Compliance deadline tracking",
      "Legal obligation logging",
      "Risk threshold monitoring",
      "Regulatory change alerts",
    ],
    handledEvents: [
      "ContractRiskFlagged",
      "ComplianceDeadlineApproaching",
      "RiskThresholdExceeded",
    ],
  },
};

export default function AgentPage() {
  const params = useParams<{ agentSlug: string }>();
  const slug = params.agentSlug ?? "";
  const meta = AGENT_META[slug];

  const utils = trpc.useUtils();
  const { data: agents } = trpc.agents.list.useQuery();
  const toggleMutation = trpc.agents.toggle.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      toast.success("Agent updated");
    },
  });

  const { data: events } = trpc.events.list.useQuery({ limit: 50 });

  if (!meta) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: "oklch(0.5 0.02 260)" }}>Agent not found</p>
      </div>
    );
  }

  const agentConfig = agents?.find((a) => a.name === meta.name);
  const isEnabled = agentConfig?.enabled ?? true;

  const agentEvents = (events ?? []).filter((e) =>
    meta.handledEvents.includes(e.eventType)
  );

  const Icon = meta.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: `${meta.color}20`,
              border: `1px solid ${meta.color}40`,
              boxShadow: `0 0 20px ${meta.color}15`,
            }}
          >
            <Icon size={28} style={{ color: meta.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
              {meta.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
              {meta.description}
            </p>
          </div>
        </div>

        <button
          onClick={() => toggleMutation.mutate({ agentName: meta.name, enabled: !isEnabled })}
          disabled={toggleMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: isEnabled ? `${meta.color}15` : "oklch(0.18 0.02 260)",
            border: `1px solid ${isEnabled ? `${meta.color}40` : "oklch(0.25 0.02 260)"}`,
            color: isEnabled ? meta.color : "oklch(0.5 0.02 260)",
          }}
        >
          {isEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {isEnabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Capabilities */}
        <div
          className="rounded-xl p-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} style={{ color: meta.color }} />
            <h2 className="text-sm font-semibold text-white">Capabilities</h2>
          </div>
          <div className="space-y-2">
            {meta.capabilities.map((cap) => (
              <div key={cap} className="flex items-start gap-2">
                <CheckCircle size={13} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                <span className="text-xs" style={{ color: "oklch(0.7 0.01 260)" }}>
                  {cap}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Handled events */}
        <div
          className="rounded-xl p-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: meta.color }} />
            <h2 className="text-sm font-semibold text-white">Handled Events</h2>
          </div>
          <div className="space-y-2">
            {meta.handledEvents.map((evt) => (
              <div
                key={evt}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                style={{
                  background: `${meta.color}10`,
                  border: `1px solid ${meta.color}25`,
                  color: meta.color,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                {evt}
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div
          className="rounded-xl p-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: meta.color }} />
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full ml-auto"
              style={{
                background: `${meta.color}15`,
                color: meta.color,
              }}
            >
              {agentEvents.length}
            </span>
          </div>
          {agentEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Icon size={24} style={{ color: "oklch(0.3 0.02 260)" }} />
              <p className="text-xs" style={{ color: "oklch(0.4 0.02 260)" }}>
                No events yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {agentEvents.slice(0, 8).map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2 rounded-lg"
                  style={{ background: "oklch(0.15 0.015 260)" }}
                >
                  <p className="text-xs font-mono" style={{ color: meta.color }}>
                    {event.eventType}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.02 260)" }}>
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status panel */}
      <div
        className="rounded-xl p-4 flex items-center gap-4"
        style={{
          background: isEnabled ? `${meta.color}08` : "oklch(0.13 0.015 260)",
          border: `1px solid ${isEnabled ? `${meta.color}25` : "oklch(0.22 0.02 260)"}`,
        }}
      >
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{
            background: isEnabled ? meta.color : "oklch(0.35 0.02 260)",
            boxShadow: isEnabled ? `0 0 8px ${meta.color}` : "none",
          }}
        />
        <div>
          <p className="text-sm font-medium text-white">
            {meta.name} is {isEnabled ? "active and monitoring events" : "disabled"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.5 0.02 260)" }}>
            {isEnabled
              ? `Listening for ${meta.handledEvents.length} event types · ${agentEvents.length} events processed`
              : "Toggle to re-enable this agent"}
          </p>
        </div>
      </div>
    </div>
  );
}
