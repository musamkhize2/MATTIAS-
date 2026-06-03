import LogoHeader from "@/components/LogoHeader";
import { trpc } from "@/lib/trpc";
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function DataSources() {
  const utils = trpc.useUtils();
  const { data: sources, isLoading } = trpc.dataSources.list.useQuery();
  const createMutation = trpc.dataSources.create.useMutation({
    onSuccess: () => {
      utils.dataSources.list.invalidate();
      toast.success("Data source created");
      setShowForm(false);
      setForm({ name: "", type: "webhook", config: {} });
    },
    onError: (err) => toast.error("Failed", { description: err.message }),
  });
  const deleteMutation = trpc.dataSources.delete.useMutation({
    onSuccess: () => { utils.dataSources.list.invalidate(); toast.success("Data source deleted"); },
    onError: (err) => toast.error("Failed", { description: err.message }),
  });
  const toggleMutation = trpc.dataSources.toggle.useMutation({
    onSuccess: () => utils.dataSources.list.invalidate(),
    onError: (err) => toast.error("Failed", { description: err.message }),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "webhook" as "webhook" | "crm" | "api", config: {} });
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Data Sources</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
            Manage webhooks and API integrations for real-time event ingestion
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="gap-2 text-sm"
          style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
        >
          <Plus size={14} />
          New Source
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.65 0.22 270 / 0.3)" }}
        >
          <h3 className="text-sm font-semibold text-white">Create Data Source</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>
                Source Name
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Production Webhooks"
                className="text-sm"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
              >
                <option value="webhook">Webhook</option>
                <option value="api">API</option>
                <option value="crm">CRM</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
              className="text-sm"
              style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
            >
              Create Source
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

      {/* Sources list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12" style={{ color: "oklch(0.45 0.02 260)" }}>
          <Webhook size={18} className="animate-pulse mr-2" />
          <span className="text-sm">Loading data sources...</span>
        </div>
      ) : sources?.length ? (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-xl p-4"
              style={{
                background: "oklch(0.13 0.015 260)",
                border: `1px solid ${source.isActive ? "oklch(0.22 0.02 260)" : "oklch(0.18 0.015 260)"}`,
                opacity: source.isActive ? 1 : 0.6,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Webhook size={14} style={{ color: "oklch(0.65 0.22 270)" }} />
                    <span className="text-sm font-semibold text-white">{source.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "oklch(0.65 0.22 270 / 0.15)",
                        color: "oklch(0.65 0.22 270)",
                        border: "1px solid oklch(0.65 0.22 270 / 0.3)",
                      }}
                    >
                      {source.type}
                    </span>
                  </div>

                  {source.type === "webhook" && source.webhookSecret && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-white">Webhook URL:</p>
                      <div className="flex items-center gap-2">
                        <code
                          className="text-xs px-3 py-1.5 rounded-lg flex-1 overflow-x-auto"
                          style={{ background: "oklch(0.15 0.015 260)", color: "oklch(0.65 0.22 270)" }}
                        >
                          /api/webhooks/{source.id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(`/api/webhooks/${source.id}`, source.id)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          {copiedId === source.id
                            ? <Check size={14} style={{ color: "oklch(0.68 0.2 145)" }} />
                            : <Copy size={14} style={{ color: "oklch(0.5 0.02 260)" }} />
                          }
                        </button>
                      </div>
                    </div>
                  )}

                  {source.lastSyncAt && (
                    <p className="text-xs mt-2" style={{ color: "oklch(0.45 0.02 260)" }}>
                      Last synced: {new Date(source.lastSyncAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: source.id, isActive: !source.isActive })}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {source.isActive
                      ? <ToggleRight size={18} style={{ color: "oklch(0.68 0.2 145)" }} />
                      : <ToggleLeft size={18} style={{ color: "oklch(0.4 0.02 260)" }} />
                    }
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: source.id })}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <Trash2 size={14} style={{ color: "oklch(0.5 0.02 260)" }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <Webhook size={32} style={{ color: "oklch(0.45 0.02 260)", margin: "0 auto 12px" }} />
          <p className="text-sm text-white font-medium">No data sources yet</p>
          <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 260)" }}>
            Create a webhook or API source to start ingesting real-time events
          </p>
        </div>
      )}
    </div>
  );
}
