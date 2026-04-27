import { trpc } from "@/lib/trpc";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const CRM_CONNECTORS = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Connect your HubSpot CRM to sync leads, deals, and contacts",
    icon: "🔵",
    color: "oklch(0.65 0.22 270)",
    features: ["Lead sync", "Deal tracking", "Contact management", "Activity logging"],
    oauthUrl: "https://app.hubspot.com/oauth/authorize",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Integrate with Salesforce to automate your sales pipeline",
    icon: "☁️",
    color: "oklch(0.68 0.2 145)",
    features: ["Opportunity sync", "Account management", "Custom objects", "Workflow automation"],
    oauthUrl: "https://login.salesforce.com/services/oauth2/authorize",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sync your Pipedrive deals and activities with MATTIAS",
    icon: "📊",
    color: "oklch(0.75 0.18 75)",
    features: ["Deal pipeline", "Activity tracking", "Person/Company sync", "Stage automation"],
    oauthUrl: "https://oauth.pipedrive.com/oauth/authorize",
  },
];

export default function CRMMarketplace() {
  const utils = trpc.useUtils();
  const { data: connectors, isLoading } = trpc.crmConnectors.list.useQuery();
  const createMutation = trpc.crmConnectors.create.useMutation({
    onSuccess: () => {
      utils.crmConnectors.list.invalidate();
      toast.success("CRM connector created");
    },
    onError: (err) => toast.error("Failed", { description: err.message }),
  });
  const deleteMutation = trpc.crmConnectors.delete.useMutation({
    onSuccess: () => { utils.crmConnectors.list.invalidate(); toast.success("Connector deleted"); },
    onError: (err) => toast.error("Failed", { description: err.message }),
  });
  const toggleMutation = trpc.crmConnectors.toggle.useMutation({
    onSuccess: () => utils.crmConnectors.list.invalidate(),
    onError: (err) => toast.error("Failed", { description: err.message }),
  });

  const [selectedCRM, setSelectedCRM] = useState<string | null>(null);
  const [oauthToken, setOauthToken] = useState("");
  const [displayName, setDisplayName] = useState("");

  const connectorMap = new Map(connectors?.map((c) => [c.crmType, c]) || []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">CRM Marketplace</h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
          Connect your CRM to automatically sync leads, deals, and contacts into MATTIAS
        </p>
      </div>

      {/* Available CRMs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CRM_CONNECTORS.map((crm) => {
          const connected = connectorMap.has(crm.id as any);
          const connector = connectorMap.get(crm.id as any);

          return (
            <div
              key={crm.id}
              className="rounded-xl p-5 border transition-all hover:border-opacity-100"
              style={{
                background: "oklch(0.13 0.015 260)",
                borderColor: connected ? crm.color : "oklch(0.22 0.02 260)",
                borderWidth: "1px",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{crm.icon}</div>
                {connected && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ background: `${crm.color}20`, color: crm.color }}
                  >
                    Connected
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{crm.name}</h3>
              <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.02 260)" }}>
                {crm.description}
              </p>

              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-white">Features:</p>
                <div className="flex flex-wrap gap-1">
                  {crm.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: `${crm.color}15`,
                        color: crm.color,
                        border: `1px solid ${crm.color}30`,
                      }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {connected ? (
                <div className="space-y-2">
                  <div
                    className="text-xs p-2 rounded-lg"
                    style={{ background: "oklch(0.15 0.015 260)" }}
                  >
                    <p className="font-medium text-white">{connector?.displayName}</p>
                    <p style={{ color: "oklch(0.45 0.02 260)" }}>
                      Last synced:{" "}
                      {connector?.lastSyncAt
                        ? new Date(connector.lastSyncAt).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMutation.mutate({ id: connector!.id, isActive: !connector?.isActive })}
                      className="flex-1 p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      {connector?.isActive
                        ? <ToggleRight size={16} style={{ color: "oklch(0.68 0.2 145)" }} />
                        : <ToggleLeft size={16} style={{ color: "oklch(0.4 0.02 260)" }} />
                      }
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate({ id: connector!.id })}
                      className="flex-1 p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      <Trash2 size={14} style={{ color: "oklch(0.5 0.02 260)" }} />
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setSelectedCRM(crm.id)}
                  className="w-full gap-2 text-sm"
                  style={{ background: crm.color, color: "white" }}
                >
                  <Plus size={14} />
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection Form */}
      {selectedCRM && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.65 0.22 270 / 0.3)" }}
        >
          <h3 className="text-sm font-semibold text-white">
            Connect {CRM_CONNECTORS.find((c) => c.id === selectedCRM)?.name}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Main HubSpot Account"
                className="text-sm"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
              />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "oklch(0.55 0.02 260)" }}>
                OAuth Token
              </label>
              <Input
                value={oauthToken}
                onChange={(e) => setOauthToken(e.target.value)}
                placeholder="Paste your OAuth token here"
                type="password"
                className="text-sm font-mono"
                style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
              />
              <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 260)" }}>
                Get your token from the CRM's OAuth settings
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  createMutation.mutate({
                    crmType: selectedCRM as "hubspot" | "salesforce" | "pipedrive",
                    displayName,
                    oauthToken,
                  });
                  setSelectedCRM(null);
                  setDisplayName("");
                  setOauthToken("");
                }}
                disabled={!displayName || !oauthToken || createMutation.isPending}
                className="text-sm"
                style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
              >
                Connect CRM
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCRM(null);
                  setDisplayName("");
                  setOauthToken("");
                }}
                className="text-sm"
                style={{ borderColor: "oklch(0.25 0.02 260)", color: "oklch(0.6 0.02 260)" }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div
        className="rounded-xl p-4"
        style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
      >
        <div className="flex gap-3">
          <Zap size={16} style={{ color: "oklch(0.75 0.18 75)", marginTop: "2px" }} />
          <div>
            <p className="text-sm font-medium text-white">Real-time Sync</p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
              Once connected, MATTIAS will automatically sync new leads, deals, and contacts from your CRM. Events will trigger agent reasoning and actions based on your policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
