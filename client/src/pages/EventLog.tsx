import LogoHeader from "@/components/LogoHeader";
import { trpc } from "@/lib/trpc";
import { Activity, CircleDot, Clock, Filter, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EVENT_CATEGORIES: Record<string, string[]> = {
  sales: ["LeadCaptured", "LeadQualified", "DealWon", "DealLost", "ProposalSent", "DealStageAdvanced", "FollowUpScheduled", "LeadDisqualified"],
  finance: ["PaymentApproved", "PaymentExecuted", "PaymentFailed", "InvoiceIssued", "CashflowShortfallDetected", "BudgetExceeded", "ExpenseCategorized"],
  operations: ["TaskCreated", "TaskCompleted", "WorkflowInitiated", "SopExecuted"],
  marketing: ["CampaignLaunched", "AdPerformanceAlert", "FunnelDropDetected"],
  compliance: ["ContractRiskFlagged", "ComplianceDeadlineApproaching", "RiskThresholdExceeded"],
  communication: ["EmailDispatched", "WhatsAppMessageReceived", "CallSummaryCreated"],
  knowledge: ["KnowledgeItemStored", "InsightGenerated"],
  personal: ["HabitTracked", "GoalMilestoneReached", "ScheduleConflictDetected"],
};

function getCategory(eventType: string): string {
  for (const [cat, types] of Object.entries(EVENT_CATEGORIES)) {
    if (types.includes(eventType)) return cat;
  }
  return "system";
}

export default function EventLog() {
  const [filter, setFilter] = useState<string>("all");
  const { data: events, isLoading, refetch } = trpc.events.list.useQuery({ limit: 100 });
  const simulateMutation = trpc.events.simulate.useMutation({
    onSuccess: () => { refetch(); toast.success("Event simulated"); },
    onError: (err) => toast.error("Failed", { description: err.message }),
  });

  const filtered = filter === "all"
    ? events ?? []
    : (events ?? []).filter((e) => getCategory(e.eventType) === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Event Log</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
            Semantic event stream — all business facts flowing through MATTIAS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 text-xs"
            style={{ borderColor: "oklch(0.25 0.02 260)", color: "oklch(0.65 0.02 260)" }}
          >
            <RefreshCw size={12} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => simulateMutation.mutate({ scenario: "lead_captured" })}
            disabled={simulateMutation.isPending}
            className="gap-2 text-xs"
            style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
          >
            <CircleDot size={12} />
            Simulate Event
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["all", "sales", "finance", "operations", "marketing", "compliance", "communication", "knowledge", "personal", "system"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all capitalize font-medium`}
            style={{
              background: filter === cat ? "oklch(0.65 0.22 270 / 0.2)" : "oklch(0.15 0.015 260)",
              border: `1px solid ${filter === cat ? "oklch(0.65 0.22 270 / 0.5)" : "oklch(0.22 0.02 260)"}`,
              color: filter === cat ? "oklch(0.75 0.22 270)" : "oklch(0.55 0.02 260)",
            }}
          >
            {cat}
            {cat !== "all" && (
              <span className="ml-1 opacity-60">
                {(events ?? []).filter((e) => getCategory(e.eventType) === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid oklch(0.22 0.02 260)" }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold"
          style={{
            background: "oklch(0.15 0.015 260)",
            color: "oklch(0.45 0.02 260)",
            borderBottom: "1px solid oklch(0.22 0.02 260)",
          }}
        >
          <div className="col-span-3">Event Type</div>
          <div className="col-span-2">Aggregate</div>
          <div className="col-span-2">Source</div>
          <div className="col-span-3">Correlation ID</div>
          <div className="col-span-2">Time</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16" style={{ background: "oklch(0.13 0.015 260)" }}>
            <div className="flex items-center gap-3" style={{ color: "oklch(0.45 0.02 260)" }}>
              <Activity size={18} className="animate-pulse" />
              <span className="text-sm">Loading events...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ background: "oklch(0.13 0.015 260)" }}>
            <CircleDot size={32} style={{ color: "oklch(0.3 0.02 260)" }} />
            <p className="text-sm" style={{ color: "oklch(0.45 0.02 260)" }}>
              No events yet. Simulate one to get started.
            </p>
          </div>
        ) : (
          <div style={{ background: "oklch(0.13 0.015 260)" }}>
            {filtered.map((event, i) => {
              const cat = getCategory(event.eventType);
              return (
                <div
                  key={event.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 text-xs transition-colors hover:bg-white/5"
                  style={{
                    borderBottom: i < filtered.length - 1 ? "1px solid oklch(0.18 0.015 260)" : "none",
                  }}
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-mono text-xs event-badge-${cat}`}>
                      {event.eventType}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center" style={{ color: "oklch(0.65 0.02 260)" }}>
                    <span className="truncate">{event.aggregateType}</span>
                  </div>
                  <div className="col-span-2 flex items-center" style={{ color: "oklch(0.5 0.02 260)" }}>
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: "oklch(0.18 0.02 260)",
                        color: "oklch(0.6 0.02 260)",
                      }}
                    >
                      {event.source ?? "system"}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center font-mono" style={{ color: "oklch(0.45 0.02 260)" }}>
                    <span className="truncate">{event.correlationId ?? "—"}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1" style={{ color: "oklch(0.45 0.02 260)" }}>
                    <Clock size={11} />
                    <span>{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: "oklch(0.35 0.02 260)" }}>
        Showing {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        {filter !== "all" ? ` in ${filter}` : ""}
      </p>
    </div>
  );
}
