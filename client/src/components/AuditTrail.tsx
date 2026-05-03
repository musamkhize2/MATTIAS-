import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Shield,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  action: "created" | "verified" | "used" | "rotated" | "refreshed" | "disabled" | "enabled" | "deleted" | "failed_verification";
  performedBy?: string;
  timestamp: Date;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

const mockAuditTrail: AuditEntry[] = [
  {
    id: "audit-1",
    action: "verified",
    performedBy: "Sarah Chen",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    details: { status: "success", method: "oauth_refresh" },
    ipAddress: "192.168.1.100",
  },
  {
    id: "audit-2",
    action: "used",
    performedBy: "System",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    details: { endpoint: "hubspot.crm.api", calls: 45 },
  },
  {
    id: "audit-3",
    action: "rotated",
    performedBy: "Admin Bot",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    details: { rotationType: "automatic", reason: "scheduled_rotation" },
  },
  {
    id: "audit-4",
    action: "created",
    performedBy: "Sarah Chen",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    details: { integrationName: "HubSpot CRM", scope: "contacts,deals" },
  },
];

function getActionIcon(action: string) {
  switch (action) {
    case "created":
      return <LogIn className="w-4 h-4 text-blue-500" />;
    case "verified":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "used":
      return <Eye className="w-4 h-4 text-cyan-500" />;
    case "rotated":
      return <Shield className="w-4 h-4 text-purple-500" />;
    case "refreshed":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "disabled":
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    case "enabled":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "deleted":
      return <LogOut className="w-4 h-4 text-red-500" />;
    case "failed_verification":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getActionLabel(action: string) {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function AuditTrail() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Audit Trail</h3>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <div className="space-y-3">
        {mockAuditTrail.map((entry, index) => (
          <div
            key={entry.id}
            className="flex gap-4 pb-4"
            style={{
              borderBottom: index < mockAuditTrail.length - 1 ? "1px solid oklch(0.22 0.02 260)" : "none",
            }}
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-full" style={{ background: "oklch(0.2 0.015 260)" }}>
                {getActionIcon(entry.action)}
              </div>
              {index < mockAuditTrail.length - 1 && (
                <div className="w-0.5 h-8" style={{ background: "oklch(0.22 0.02 260)" }} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-sm">{getActionLabel(entry.action)}</span>
                {entry.performedBy && (
                  <>
                    <span style={{ color: "oklch(0.4 0.02 260)" }}>by</span>
                    <span className="text-sm" style={{ color: "oklch(0.65 0.22 270)" }}>
                      {entry.performedBy}
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>
                {format(entry.timestamp, "MMM d, yyyy h:mm a")}
              </p>

              {entry.details && (
                <div className="mt-2 text-xs space-y-1" style={{ color: "oklch(0.55 0.02 260)" }}>
                  {Object.entries(entry.details).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-mono">{key}:</span>
                      <span>{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {entry.ipAddress && (
                <p className="text-xs mt-2 font-mono" style={{ color: "oklch(0.4 0.02 260)" }}>
                  IP: {entry.ipAddress}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
