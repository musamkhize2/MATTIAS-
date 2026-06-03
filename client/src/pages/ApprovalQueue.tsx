import LogoHeader from "@/components/LogoHeader";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function RiskBadge({ score }: { score: number | null }) {
  const pct = Math.round((score ?? 0) * 100);
  const color =
    pct >= 70
      ? "oklch(0.6 0.22 25)"
      : pct >= 40
      ? "oklch(0.75 0.18 75)"
      : "oklch(0.68 0.2 145)";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
    >
      {label} {pct}%
    </span>
  );
}

function ApprovalCard({ item, onResolve }: {
  item: {
    id: number;
    eventType: string;
    agentName: string | null;
    agentReasoning: string | null;
    actionType: string;
    actionPayload: Record<string, unknown> | null;
    riskScore: number | null;
    status: string;
    correlationId: string | null;
    createdAt: Date;
    eventData: Record<string, unknown> | null;
  };
  onResolve: (id: number, status: "APPROVED" | "REJECTED") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = item.status === "PENDING";

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "oklch(0.13 0.015 260)",
        border: `1px solid ${isPending ? "oklch(0.75 0.18 75 / 0.3)" : "oklch(0.22 0.02 260)"}`,
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-mono"
                style={{
                  background: "oklch(0.65 0.22 270 / 0.15)",
                  border: "1px solid oklch(0.65 0.22 270 / 0.3)",
                  color: "oklch(0.75 0.22 270)",
                }}
              >
                {item.eventType}
              </span>
              <span className="text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>→</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-mono"
                style={{
                  background: "oklch(0.72 0.18 200 / 0.15)",
                  border: "1px solid oklch(0.72 0.18 200 / 0.3)",
                  color: "oklch(0.78 0.18 200)",
                }}
              >
                {item.actionType}
              </span>
              <RiskBadge score={item.riskScore} />
              {!isPending && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: item.status === "APPROVED" ? "oklch(0.68 0.2 145 / 0.2)" : "oklch(0.6 0.22 25 / 0.2)",
                    color: item.status === "APPROVED" ? "oklch(0.75 0.2 145)" : "oklch(0.7 0.22 25)",
                  }}
                >
                  {item.status}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>
              <Brain size={12} />
              <span>{item.agentName ?? "Unknown Agent"}</span>
              <span>·</span>
              <Clock size={11} />
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {isPending && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => onResolve(item.id, "REJECTED")}
                className="h-8 px-3 text-xs gap-1"
                style={{
                  background: "oklch(0.6 0.22 25 / 0.15)",
                  border: "1px solid oklch(0.6 0.22 25 / 0.4)",
                  color: "oklch(0.7 0.22 25)",
                }}
              >
                <XCircle size={13} />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => onResolve(item.id, "APPROVED")}
                className="h-8 px-3 text-xs gap-1"
                style={{
                  background: "oklch(0.68 0.2 145 / 0.15)",
                  border: "1px solid oklch(0.68 0.2 145 / 0.4)",
                  color: "oklch(0.75 0.2 145)",
                }}
              >
                <CheckCircle size={13} />
                Approve
              </Button>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 mt-3 text-xs transition-colors"
          style={{ color: "oklch(0.5 0.02 260)" }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Hide" : "Show"} agent reasoning
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: "1px solid oklch(0.2 0.015 260)" }}
        >
          <div className="pt-3">
            <p className="text-xs font-semibold mb-1" style={{ color: "oklch(0.55 0.02 260)" }}>
              AGENT REASONING
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "oklch(0.7 0.01 260)" }}>
              {item.agentReasoning ?? "No reasoning provided"}
            </p>
          </div>

          {item.actionPayload && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "oklch(0.55 0.02 260)" }}>
                ACTION PAYLOAD
              </p>
              <pre
                className="text-xs p-3 rounded-lg overflow-auto"
                style={{
                  background: "oklch(0.1 0.01 260)",
                  color: "oklch(0.65 0.02 260)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {JSON.stringify(item.actionPayload as Record<string, unknown>, null, 2)}
              </pre>
            </div>
          )}

          {item.eventData && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "oklch(0.55 0.02 260)" }}>
                TRIGGERING EVENT DATA
              </p>
              <pre
                className="text-xs p-3 rounded-lg overflow-auto"
                style={{
                  background: "oklch(0.1 0.01 260)",
                  color: "oklch(0.65 0.02 260)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {JSON.stringify(item.eventData as Record<string, unknown>, null, 2)}
              </pre>
            </div>
          )}

          {item.correlationId && (
            <p className="text-xs font-mono" style={{ color: "oklch(0.4 0.02 260)" }}>
              Correlation: {item.correlationId}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApprovalQueue() {
  const utils = trpc.useUtils();
  const { data: pending, isLoading: loadingPending } = trpc.approvals.listPending.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const { data: all, isLoading: loadingAll } = trpc.approvals.listAll.useQuery({ limit: 50 });

  const resolveMutation = trpc.approvals.resolve.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Action ${vars.status.toLowerCase()}`, {
        description: `Approval #${vars.id} has been ${vars.status.toLowerCase()}.`,
      });
      utils.approvals.listPending.invalidate();
      utils.approvals.listAll.invalidate();
    },
    onError: (err) => toast.error("Failed to resolve", { description: err.message }),
  });

  const handleResolve = (id: number, status: "APPROVED" | "REJECTED") => {
    resolveMutation.mutate({ id, status });
  };

  const resolved = (all ?? []).filter((a) => a.status !== "PENDING");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Approval Queue</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
            Actions requiring your sign-off before execution
          </p>
        </div>
        {(pending?.length ?? 0) > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{
              background: "oklch(0.75 0.18 75 / 0.15)",
              border: "1px solid oklch(0.75 0.18 75 / 0.4)",
              color: "oklch(0.82 0.18 75)",
            }}
          >
            <AlertTriangle size={14} />
            {pending?.length} pending
          </div>
        )}
      </div>

      {/* Pending section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} style={{ color: "oklch(0.75 0.18 75)" }} />
          <h2 className="text-sm font-semibold text-white">Pending Approval</h2>
          <Badge
            className="text-xs"
            style={{
              background: "oklch(0.75 0.18 75 / 0.15)",
              color: "oklch(0.82 0.18 75)",
              border: "1px solid oklch(0.75 0.18 75 / 0.3)",
            }}
          >
            {pending?.length ?? 0}
          </Badge>
        </div>

        {loadingPending ? (
          <div className="flex items-center justify-center py-12" style={{ color: "oklch(0.45 0.02 260)" }}>
            <Brain size={18} className="animate-pulse mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : !pending?.length ? (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-xl gap-3"
            style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
          >
            <CheckCircle size={32} style={{ color: "oklch(0.68 0.2 145)" }} />
            <p className="text-sm font-medium text-white">All clear</p>
            <p className="text-xs" style={{ color: "oklch(0.45 0.02 260)" }}>
              No actions pending your approval
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <ApprovalCard key={item.id} item={item as Parameters<typeof ApprovalCard>[0]['item']} onResolve={handleResolve} />
            ))}
          </div>
        )}
      </div>

      {/* Resolved section */}
      {resolved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} style={{ color: "oklch(0.55 0.02 260)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "oklch(0.55 0.02 260)" }}>
              Resolved
            </h2>
            <Badge
              className="text-xs"
              style={{
                background: "oklch(0.18 0.02 260)",
                color: "oklch(0.5 0.02 260)",
                border: "1px solid oklch(0.25 0.02 260)",
              }}
            >
              {resolved.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {resolved.slice(0, 10).map((item) => (
              <ApprovalCard key={item.id} item={item as Parameters<typeof ApprovalCard>[0]['item']} onResolve={handleResolve} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
