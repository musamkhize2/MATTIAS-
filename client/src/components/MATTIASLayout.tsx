import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Bell,
  BookOpen,
  Brain,
  CheckSquare,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Heart,
  Key,
  Layers,
  LogOut,
  MessageSquare,
  Monitor,
  BarChart3,
  Scale,
  Settings,
  Shield,
  ShoppingCart,
  Terminal,
  TrendingUp,
  Webhook,
  Zap,
  GitBranch,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const AGENTS = [
  { slug: "operations", label: "Operations", icon: Layers, color: "oklch(0.72 0.18 200)" },
  { slug: "finance", label: "Finance", icon: TrendingUp, color: "oklch(0.68 0.2 145)" },
  { slug: "sales", label: "Sales", icon: ShoppingCart, color: "oklch(0.65 0.22 270)" },
  { slug: "marketing", label: "Marketing", icon: Zap, color: "oklch(0.75 0.18 75)" },
  { slug: "knowledge", label: "Knowledge", icon: BookOpen, color: "oklch(0.62 0.22 300)" },
  { slug: "personal-life", label: "Personal Life", icon: Heart, color: "oklch(0.7 0.2 170)" },
  { slug: "communication", label: "Communication", icon: MessageSquare, color: "oklch(0.72 0.18 200)" },
  { slug: "compliance-risk", label: "Compliance & Risk", icon: Shield, color: "oklch(0.6 0.22 25)" },
];

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  color?: string;
  active: boolean;
}

function NavItem({ href, icon: Icon, label, badge, color, active }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 group ${
          active
            ? "bg-white/10 text-white"
            : "text-white/50 hover:text-white/80 hover:bg-white/5"
        }`}
      >
        <Icon
          size={16}
          style={{ color: active ? (color ?? "oklch(0.65 0.22 270)") : undefined }}
          className={active ? "" : "group-hover:text-white/70"}
        />
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge
            className="text-xs px-1.5 py-0 h-5 min-w-5 flex items-center justify-center"
            style={{
              background: "oklch(0.6 0.22 25 / 0.2)",
              color: "oklch(0.72 0.22 25)",
              border: "1px solid oklch(0.6 0.22 25 / 0.4)",
            }}
          >
            {badge}
          </Badge>
        )}
        {active && (
          <ChevronRight size={12} className="opacity-50" />
        )}
      </div>
    </Link>
  );
}

export default function MATTIASLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: pendingApprovals } = trpc.approvals.listPending.useQuery(undefined, {
    refetchInterval: 10000,
    enabled: isAuthenticated,
  });

  const pendingCount = pendingApprovals?.length ?? 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.1 0.01 260)" }}>
        <div className="text-center space-y-6 max-w-md px-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.65 0.22 270 / 0.2)", border: "1px solid oklch(0.65 0.22 270 / 0.4)" }}
            >
              <Brain size={24} style={{ color: "oklch(0.75 0.22 270)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">MATTIAS</h1>
              <p className="text-xs" style={{ color: "oklch(0.55 0.02 260)" }}>AI Operating System</p>
            </div>
          </div>

          <div
            className="p-6 rounded-2xl space-y-4"
            style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
          >
            <h2 className="text-lg font-semibold text-white">Access MATTIAS</h2>
            <p style={{ color: "oklch(0.6 0.02 260)" }} className="text-sm">
              Sign in to access your AI command center — where autonomous agents reason, decide, and act on your behalf.
            </p>
            <Button
              className="w-full font-semibold"
              style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
              onClick={() => (window.location.href = getLoginUrl())}
            >
              Sign In to MATTIAS
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {["8 AI Agents", "Event-Driven", "Autonomous"].map((feat) => (
              <div
                key={feat}
                className="p-3 rounded-lg text-xs font-medium"
                style={{
                  background: "oklch(0.13 0.015 260)",
                  border: "1px solid oklch(0.22 0.02 260)",
                  color: "oklch(0.65 0.22 270)",
                }}
              >
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "oklch(0.1 0.01 260)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-60 shrink-0 h-full overflow-y-auto"
        style={{
          background: "oklch(0.12 0.015 260)",
          borderRight: "1px solid oklch(0.22 0.02 260)",
        }}
      >
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: "oklch(0.22 0.02 260)" }}>
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "oklch(0.65 0.22 270 / 0.2)",
                  border: "1px solid oklch(0.65 0.22 270 / 0.4)",
                  boxShadow: "0 0 12px oklch(0.65 0.22 270 / 0.2)",
                }}
              >
                <Brain size={18} style={{ color: "oklch(0.75 0.22 270)" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest text-white">MATTIAS</div>
                <div className="text-xs" style={{ color: "oklch(0.45 0.02 260)" }}>
                  AI Operating System
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Live status */}
        <div className="px-4 py-2 border-b" style={{ borderColor: "oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full pulse-dot"
              style={{ background: "oklch(0.68 0.2 145)" }}
            />
            <span className="text-xs" style={{ color: "oklch(0.55 0.02 260)" }}>
              System Active
            </span>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="mb-2">
            <p className="text-xs font-semibold px-3 mb-1" style={{ color: "oklch(0.4 0.02 260)" }}>
              COMMAND
            </p>
            <NavItem href="/" icon={Activity} label="Dashboard" active={location === "/"} />
            <NavItem href="/command" icon={Terminal} label="Command Center" active={location === "/command"} />
            <NavItem
              href="/approvals"
              icon={CheckSquare}
              label="Approval Queue"
              badge={pendingCount}
              active={location === "/approvals"}
            />
            <NavItem href="/events" icon={CircleDot} label="Event Log" active={location === "/events"} />
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold px-3 mb-1" style={{ color: "oklch(0.4 0.02 260)" }}>
              AGENTS
            </p>
            {AGENTS.map((agent) => (
              <NavItem
                key={agent.slug}
                href={`/agents/${agent.slug}`}
                icon={agent.icon}
                label={agent.label}
                color={agent.color}
                active={location === `/agents/${agent.slug}`}
              />
            ))}
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold px-3 mb-1" style={{ color: "oklch(0.4 0.02 260)" }}>
              SYSTEM
            </p>
            <NavItem href="/autonomy" icon={Settings} label="Autonomy Controls" active={location === "/autonomy"} />
            <NavItem href="/memory" icon={Brain} label="Memory Explorer" active={location === "/memory"} />
            <NavItem href="/policies" icon={ClipboardList} label="Policy Manager" active={location === "/policies"} />
            <NavItem href="/credentials" icon={Key} label="Credentials" active={location === "/credentials"} />
          </div>

          <div className="pt-2">
            <p className="text-xs font-semibold px-3 mb-1" style={{ color: "oklch(0.4 0.02 260)" }}>
              INTEGRATIONS
            </p>
            <NavItem href="/data-sources" icon={Webhook} label="Data Sources" active={location === "/data-sources"} />
            <NavItem href="/crm-marketplace" icon={Zap} label="CRM Marketplace" active={location === "/crm-marketplace"} />
            <NavItem href="/workflows" icon={GitBranch} label="Workflow Builder" active={location === "/workflows"} />
            <NavItem href="/integration-health" icon={Monitor} label="Health Status" active={location === "/integration-health"} />
            <NavItem href="/campaigns" icon={BarChart3} label="Campaigns" active={location === "/campaigns"} />
          </div>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t" style={{ borderColor: "oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "oklch(0.65 0.22 270 / 0.3)", color: "oklch(0.75 0.22 270)" }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? "M"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name ?? "User"}</p>
              <p className="text-xs truncate" style={{ color: "oklch(0.45 0.02 260)" }}>
                {user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} style={{ color: "oklch(0.5 0.02 260)" }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
