import LogoHeader from "@/components/LogoHeader";
import { trpc } from "@/lib/trpc";
import { ClipboardList, Plus, Shield, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const EXAMPLE_POLICIES = [
  {
    name: "Block large payments",
    description: "Require approval for any payment over $10,000",
    eventCondition: "PaymentApproved",
    riskThreshold: 0.7,
    action: "REQUIRE_APPROVAL",
  },
  {
    name: "Auto-approve small tasks",
    description: "Automatically execute task creation with low risk",
    eventCondition: "TaskCreated",
    riskThreshold: 0.2,
    action: "AUTO_EXECUTE",
  },
  {
    name: "Flag contract risks",
    description: "Always require approval for flagged contracts",
    eventCondition: "ContractRiskFlagged",
    riskThreshold: 0.5,
    action: "REQUIRE_APPROVAL",
  },
];

export default function PolicyManager() {
  const utils = trpc.useUtils();
  const { data: policies, isLoading } = trpc.policies.list.useQuery();
  const createMutation = trpc.policies.create.useMutation({
    onSuccess: () => {
      utils.policies.list.invalidate();
      toast.success("Policy created");
      setShowForm(false);
      setForm({ name: "", description: "", eventCondition: "", riskThreshold: 0.5, effect: "REQUIRE_APPROVAL" });
    },
    onError: (err: { message: string }) => toast.error("Failed", { description: err.message }),
  });
  const deleteMutation = trpc.policies.delete.useMutation({
    onSuccess: () => { utils.policies.list.invalidate(); toast.success("Policy deleted"); },
    onError: (err) => toast.error("Failed", { description: err.message }),
  });
  const toggleMutation = trpc.policies.toggle.useMutation({
    onSuccess: () => utils.policies.list.invalidate(),
    onError: (err) => toast.error("Failed", { description: err.message }),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    eventCondition: "",
    riskThreshold: 0.5,
    effect: "REQUIRE_APPROVAL" as "REQUIRE_APPROVAL" | "ALLOW" | "DENY",
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Policy Manager</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
            Event-condition rules that govern agent autonomy and action execution
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="gap-2 text-sm"
          style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
        >
          <Plus size={14} />
          New Policy
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.65 0.22 270 / 0.3)" }}
        >
          <h3 className="text-sm font-semibold text-white">Create Policy</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>Policy Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Block large payments"
                className="text-sm"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>Event Condition</label>
              <Input
                value={form.eventCondition}
                onChange={(e) => setForm((f) => ({ ...f, eventCondition: e.target.value }))}
                placeholder="e.g. PaymentApproved"
                className="text-sm font-mono"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>
                Risk Threshold: {Math.round(form.riskThreshold * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.riskThreshold}
                onChange={(e) => setForm((f) => ({ ...f, riskThreshold: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>Action</label>
              <select
                value={form.effect}
                onChange={(e) => setForm((f) => ({ ...f, effect: e.target.value as typeof form.effect }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
              >
                <option value="REQUIRE_APPROVAL">Require Approval</option>
                <option value="ALLOW">Allow (Auto Execute)</option>
                <option value="DENY">Deny (Block)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe what this policy does..."
              className="text-sm"
              style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => createMutation.mutate({
                name: form.name,
                description: form.description,
                eventConditions: { eventType: form.eventCondition, riskThreshold: form.riskThreshold },
                effect: form.effect,
              })}
              disabled={!form.name || !form.eventCondition || createMutation.isPending}
              className="text-sm"
              style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
            >
              Create Policy
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="text-sm"
              style={{ borderColor: "oklch(0.25 0.02 260)", color: "oklch(0.6 0.02 260)" }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Example policies */}
      {!policies?.length && !isLoading && (
        <div
          className="rounded-xl p-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: "oklch(0.5 0.02 260)" }}>EXAMPLE POLICIES</p>
          <div className="space-y-2">
            {EXAMPLE_POLICIES.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setForm({ name: p.name, description: p.description, eventCondition: p.eventCondition, riskThreshold: p.riskThreshold, effect: p.action as typeof form.effect });
                  setShowForm(true);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all hover:bg-white/5"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{p.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "oklch(0.75 0.18 75 / 0.15)",
                      color: "oklch(0.82 0.18 75)",
                    }}
                  >
                    {p.action}
                  </span>
                </div>
                <p className="mt-0.5" style={{ color: "oklch(0.5 0.02 260)" }}>{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Policy list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12" style={{ color: "oklch(0.45 0.02 260)" }}>
          <ClipboardList size={18} className="animate-pulse mr-2" />
          <span className="text-sm">Loading policies...</span>
        </div>
      ) : policies?.length ? (
        <div className="space-y-3">
          {policies.map((policy) => {
            const actionColor =
              policy.effect === "REQUIRE_APPROVAL"
                ? "oklch(0.75 0.18 75)"
                : policy.effect === "DENY"
                ? "oklch(0.6 0.22 25)"
                : "oklch(0.68 0.2 145)";

            return (
              <div
                key={policy.id}
                className="rounded-xl p-4"
                style={{
                  background: "oklch(0.13 0.015 260)",
                  border: `1px solid ${policy.enabled ? "oklch(0.22 0.02 260)" : "oklch(0.18 0.015 260)"}`,
                  opacity: policy.enabled ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={14} style={{ color: actionColor }} />
                      <span className="text-sm font-semibold text-white">{policy.name}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${actionColor}15`, color: actionColor, border: `1px solid ${actionColor}30` }}
                      >
                        {policy.effect?.replace("_", " ")}
                      </span>
                    </div>
                    {policy.description && (
                      <p className="text-xs mb-2" style={{ color: "oklch(0.55 0.02 260)" }}>{policy.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs" style={{ color: "oklch(0.45 0.02 260)" }}>
                    <span className="font-mono" style={{ color: "oklch(0.65 0.22 270)" }}>
                              {(policy.eventConditions as Record<string, unknown>)?.eventType as string ?? "any"}
                            </span>
                            <span>·</span>
                            <span>Risk ≥ {Math.round(((policy.eventConditions as Record<string, unknown>)?.riskThreshold as number ?? 0) * 100)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: policy.id, enabled: !policy.enabled })}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      {policy.enabled
                        ? <ToggleRight size={18} style={{ color: "oklch(0.68 0.2 145)" }} />
                        : <ToggleLeft size={18} style={{ color: "oklch(0.4 0.02 260)" }} />
                      }
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate({ id: policy.id })}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      <Trash2 size={14} style={{ color: "oklch(0.5 0.02 260)" }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
