import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle,
  ChevronRight,
  CircleDot,
  Clock,
  Layers,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AUTONOMY_COLORS: Record<string, string> = {
  manual: "oklch(0.55 0.02 260)",
  assisted: "oklch(0.72 0.18 200)",
  approval_guarded: "oklch(0.75 0.18 75)",
  autonomous: "oklch(0.68 0.2 145)",
};

const AUTONOMY_LABELS: Record<string, string> = {
  manual: "Manual",
  assisted: "Assisted",
  approval_guarded: "Approval-Guarded",
  autonomous: "Autonomous",
};

function getEventCategory(eventType: string): string {
  if (["LeadCaptured", "LeadQualified", "DealWon", "DealLost", "ProposalSent", "DealStageAdvanced", "FollowUpScheduled", "LeadDisqualified"].includes(eventType)) return "sales";
  if (["PaymentApproved", "PaymentExecuted", "PaymentFailed", "InvoiceIssued", "CashflowShortfallDetected", "BudgetExceeded", "ExpenseCategorized"].includes(eventType)) return "finance";
  if (["TaskCreated", "TaskCompleted", "WorkflowInitiated", "SopExecuted"].includes(eventType)) return "operations";
  if (["CampaignLaunched", "AdPerformanceAlert", "FunnelDropDetected"].includes(eventType)) return "marketing";
  if (["ContractRiskFlagged", "ComplianceDeadlineApproaching", "RiskThresholdExceeded"].includes(eventType)) return "compliance";
  if (["EmailDispatched", "WhatsAppMessageReceived", "CallSummaryCreated"].includes(eventType)) return "communication";
  if (["KnowledgeItemStored", "InsightGenerated"].includes(eventType)) return "knowledge";
  if (["HabitTracked", "GoalMilestoneReached", "ScheduleConflictDetected"].includes(eventType)) return "personal";
  return "system";
}

export default function Dashboard() {
  const { data: stats, isLoading, refetch } = trpc.dashboard.stats.useQuery();
  const simulateMutation = trpc.events.simulate.useMutation({
    onSuccess: (result) => {
      toast.success(`Event orchestrated`, {
        description: `${result.agentsInvolved.join(", ")} responded. ${result.approvalsCreated} approval(s) queued.`,
      });
      refetch();
    },
    onError: (err) => toast.error("Simulation failed", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3" style={{ color: "oklch(0.55 0.02 260)" }}>
          <Brain size={20} className="animate-pulse" />
          <span className="text-sm">Loading MATTIAS...</span>
        </div>
      </div>
    );
  }

  const autonomyColor = AUTONOMY_COLORS[stats?.autonomyLevel ?? "assisted"];
  const autonomyLabel = AUTONOMY_LABELS[stats?.autonomyLevel ?? "assisted"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
            MATTIAS AI Operating System — real-time overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: `${autonomyColor}20`,
              border: `1px solid ${autonomyColor}50`,
              color: autonomyColor,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: autonomyColor }} />
            {autonomyLabel} Mode
          </div>
          <Badge
            className="text-xs"
            style={{
              background: "oklch(0.65 0.22 270 / 0.15)",
              color: "oklch(0.75 0.22 270)",
              border: "1px solid oklch(0.65 0.22 270 / 0.3)",
            }}
          >
            {stats?.subscriptionTier?.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Events",
            value: stats?.totalEvents ?? 0,
            icon: CircleDot,
            color: "oklch(0.65 0.22 270)",
            href: "/events",
          },
          {
            label: "Pending Approvals",
            value: stats?.pendingApprovals ?? 0,
            icon: AlertTriangle,
            color: stats?.pendingApprovals ? "oklch(0.75 0.18 75)" : "oklch(0.68 0.2 145)",
            href: "/approvals",
          },
          {
            label: "Memory Entries",
            value: stats?.memoryEntries ?? 0,
            icon: Brain,
            color: "oklch(0.62 0.22 300)",
            href: "/memory",
          },
          {
            label: "Active Agents",
            value: 8,
            icon: Zap,
            color: "oklch(0.72 0.18 200)",
            href: "/agents/operations",
          },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div
              className="p-4 rounded-xl cursor-pointer hover:border-white/20 transition-all duration-150"
              style={{
                background: "oklch(0.13 0.015 260)",
                border: "1px solid oklch(0.22 0.02 260)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${stat.color}20` }}
                >
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
                <ChevronRight size={14} style={{ color: "oklch(0.4 0.02 260)" }} />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: "oklch(0.5 0.02 260)" }}>
                {stat.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent events */}
        <div
          className="col-span-2 rounded-xl p-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} style={{ color: "oklch(0.65 0.22 270)" }} />
              <h2 className="text-sm font-semibold text-white">Recent Events</h2>
            </div>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" style={{ color: "oklch(0.55 0.02 260)" }}>
                View all
              </Button>
            </Link>
          </div>

          {!stats?.recentEvents?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <CircleDot size={32} style={{ color: "oklch(0.3 0.02 260)" }} />
              <p className="text-sm" style={{ color: "oklch(0.45 0.02 260)" }}>
                No events yet. Simulate one below.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentEvents.map((event) => {
                const cat = getEventCategory(event.eventType);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: "oklch(0.15 0.015 260)" }}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 event-badge-${cat}`} style={{ background: "currentColor" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono event-badge-${cat}`}>
                          {event.eventType}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.5 0.02 260)" }}>
                        {event.aggregateType} · {event.aggregateId?.slice(0, 16)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" style={{ color: "oklch(0.4 0.02 260)" }}>
                      <Clock size={11} />
                      <span className="text-xs">
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick simulate panel */}
        <div
          className="rounded-xl p-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: "oklch(0.75 0.18 75)" }} />
            <h2 className="text-sm font-semibold text-white">Simulate Event</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "oklch(0.5 0.02 260)" }}>
            Trigger a real agent reasoning cycle with a sample business event.
          </p>
          <div className="space-y-2">
            {[
              { scenario: "lead_captured" as const, label: "Lead Captured", color: "oklch(0.65 0.22 270)" },
              { scenario: "cashflow_shortfall" as const, label: "Cashflow Shortfall", color: "oklch(0.6 0.22 25)" },
              { scenario: "payment_approved" as const, label: "Payment Approved", color: "oklch(0.68 0.2 145)" },
              { scenario: "contract_risk" as const, label: "Contract Risk", color: "oklch(0.6 0.22 25)" },
              { scenario: "campaign_launched" as const, label: "Campaign Launched", color: "oklch(0.75 0.18 75)" },
              { scenario: "task_created" as const, label: "Task Created", color: "oklch(0.72 0.18 200)" },
            ].map((item) => (
              <button
                key={item.scenario}
                onClick={() => simulateMutation.mutate({ scenario: item.scenario })}
                disabled={simulateMutation.isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}30`,
                  color: item.color,
                }}
              >
                <Layers size={12} />
                {item.label}
                {simulateMutation.isPending && <span className="ml-auto opacity-50">...</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent activity */}
      {stats?.agentActivity && Object.keys(stats.agentActivity).length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} style={{ color: "oklch(0.62 0.22 300)" }} />
            <h2 className="text-sm font-semibold text-white">Agent Activity</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.agentActivity).map(([agent, count]) => (
              <div
                key={agent}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                  background: "oklch(0.65 0.22 270 / 0.1)",
                  border: "1px solid oklch(0.65 0.22 270 / 0.25)",
                  color: "oklch(0.75 0.22 270)",
                }}
              >
                <CheckCircle size={11} />
                {agent}: {count} action{count !== 1 ? "s" : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
