import LogoHeader from "@/components/LogoHeader";
import { trpc } from "@/lib/trpc";
import { Brain, CheckCircle, Settings, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

const LEVELS = [
  {
    id: "manual" as const,
    label: "Manual",
    description:
      "All agent-proposed actions are queued for your approval. Nothing executes without your explicit sign-off. Maximum control, minimum automation.",
    color: "oklch(0.55 0.02 260)",
    icon: Shield,
    traits: ["All actions require approval", "No autonomous execution", "Full human oversight", "Lowest risk"],
  },
  {
    id: "assisted" as const,
    label: "Assisted",
    description:
      "Low-risk actions execute automatically. Medium and high-risk actions are queued for approval. Agents assist but you remain in control.",
    color: "oklch(0.72 0.18 200)",
    icon: Brain,
    traits: ["Low-risk actions auto-execute", "Medium/high risk requires approval", "Balanced automation", "Recommended for most users"],
  },
  {
    id: "approval_guarded" as const,
    label: "Approval-Guarded",
    description:
      "Only very low-risk actions execute automatically. Any action with a risk score above 30% is queued for approval. Aggressive safety net.",
    color: "oklch(0.75 0.18 75)",
    icon: Settings,
    traits: ["Very low-risk auto-executes", "30%+ risk requires approval", "Strict safety thresholds", "Good for regulated industries"],
  },
  {
    id: "autonomous" as const,
    label: "Autonomous",
    description:
      "Agents act independently based on policy rules. Only policy-blocked or explicitly flagged actions require approval. Maximum automation.",
    color: "oklch(0.68 0.2 145)",
    icon: Zap,
    traits: ["Policy-driven execution", "Minimal human intervention", "Maximum throughput", "Requires well-configured policies"],
  },
];

export default function AutonomySettings() {
  const utils = trpc.useUtils();
  const { data: tenant, isLoading } = trpc.tenant.get.useQuery();
  const updateMutation = trpc.tenant.updateAutonomy.useMutation({
    onSuccess: () => {
      utils.tenant.get.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Autonomy level updated");
    },
    onError: (err) => toast.error("Failed to update", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Brain size={20} className="animate-pulse" style={{ color: "oklch(0.45 0.02 260)" }} />
      </div>
    );
  }

  const currentLevel = tenant?.autonomyLevel ?? "assisted";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Autonomy Controls</h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
          Configure how much autonomy MATTIAS agents have when executing actions
        </p>
      </div>

      {/* Current level indicator */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{
          background: "oklch(0.13 0.015 260)",
          border: "1px solid oklch(0.22 0.02 260)",
        }}
      >
        <div
          className="w-3 h-3 rounded-full pulse-dot"
          style={{
            background: LEVELS.find((l) => l.id === currentLevel)?.color ?? "oklch(0.65 0.22 270)",
          }}
        />
        <div>
          <span className="text-sm font-medium text-white">Current mode: </span>
          <span
            className="text-sm font-bold"
            style={{ color: LEVELS.find((l) => l.id === currentLevel)?.color }}
          >
            {LEVELS.find((l) => l.id === currentLevel)?.label}
          </span>
        </div>
        <p className="text-xs ml-auto" style={{ color: "oklch(0.45 0.02 260)" }}>
          {tenant?.subscriptionTier?.toUpperCase()} plan
        </p>
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-2 gap-4">
        {LEVELS.map((level) => {
          const isActive = currentLevel === level.id;
          const Icon = level.icon;

          return (
            <button
              key={level.id}
              onClick={() => updateMutation.mutate({ level: level.id })}
              disabled={updateMutation.isPending || isActive}
              className="text-left rounded-xl p-5 transition-all hover:scale-[1.01] disabled:hover:scale-100"
              style={{
                background: isActive ? `${level.color}12` : "oklch(0.13 0.015 260)",
                border: `1px solid ${isActive ? `${level.color}50` : "oklch(0.22 0.02 260)"}`,
                boxShadow: isActive ? `0 0 20px ${level.color}15` : "none",
                cursor: isActive ? "default" : "pointer",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${level.color}20` }}
                  >
                    <Icon size={20} style={{ color: level.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{level.label}</h3>
                  </div>
                </div>
                {isActive && (
                  <CheckCircle size={18} style={{ color: level.color }} />
                )}
              </div>

              <p className="text-xs leading-relaxed mb-4" style={{ color: "oklch(0.6 0.02 260)" }}>
                {level.description}
              </p>

              <div className="space-y-1.5">
                {level.traits.map((trait) => (
                  <div key={trait} className="flex items-center gap-2">
                    <div
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ background: level.color }}
                    />
                    <span className="text-xs" style={{ color: "oklch(0.55 0.02 260)" }}>
                      {trait}
                    </span>
                  </div>
                ))}
              </div>

              {!isActive && (
                <div
                  className="mt-4 text-center py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: `${level.color}15`,
                    border: `1px solid ${level.color}30`,
                    color: level.color,
                  }}
                >
                  Switch to {level.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Risk score reference */}
      <div
        className="rounded-xl p-4"
        style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
      >
        <h3 className="text-sm font-semibold text-white mb-3">Risk Score Reference</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Low Risk", range: "0–30%", color: "oklch(0.68 0.2 145)", examples: "Send message, Create task, Log entry" },
            { label: "Medium Risk", range: "30–70%", color: "oklch(0.75 0.18 75)", examples: "External communication, Schedule changes" },
            { label: "High Risk", range: "70–100%", color: "oklch(0.6 0.22 25)", examples: "Execute payment, Delete data, Send money" },
          ].map((tier) => (
            <div
              key={tier.label}
              className="p-3 rounded-lg"
              style={{ background: `${tier.color}10`, border: `1px solid ${tier.color}25` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: tier.color }}>
                  {tier.label}
                </span>
                <span className="text-xs font-mono" style={{ color: tier.color }}>
                  {tier.range}
                </span>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>
                {tier.examples}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
