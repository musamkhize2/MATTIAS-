import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ApprovalStep {
  role: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: Date;
  comment?: string;
}

interface MultiRoleApprovalChainProps {
  approvalId: string;
  requiredRoles: string[];
  approvalChain: ApprovalStep[];
  allApprovalsReceived: boolean;
  onApprove?: (role: string) => void;
  onReject?: (role: string, reason: string) => void;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "rejected":
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case "pending":
      return <Clock className="w-5 h-5 text-yellow-500" />;
    default:
      return <Clock className="w-5 h-5" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-900 text-green-100">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "pending":
      return <Badge className="bg-yellow-900 text-yellow-100">Pending</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

export function MultiRoleApprovalChain({
  approvalId,
  requiredRoles,
  approvalChain,
  allApprovalsReceived,
  onApprove,
  onReject,
}: MultiRoleApprovalChainProps) {
  const pendingRoles = requiredRoles.filter(
    (role) => !approvalChain.find((step) => step.role === role && step.status !== "pending")
  );

  const completionPercentage = Math.round(
    ((approvalChain.filter((step) => step.status !== "pending").length) / approvalChain.length) * 100
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Multi-Role Approval Chain</CardTitle>
            <CardDescription>
              {allApprovalsReceived ? "All approvals received" : `${pendingRoles.length} roles pending approval`}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{completionPercentage}%</div>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Approval Progress</span>
            <span style={{ color: "oklch(0.5 0.02 260)" }}>
              {approvalChain.filter((s) => s.status !== "pending").length} of {approvalChain.length}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.015 260)" }}>
            <div
              className="h-full transition-all"
              style={{
                width: `${completionPercentage}%`,
                background: allApprovalsReceived
                  ? "oklch(0.68 0.2 145)"
                  : completionPercentage > 0
                  ? "oklch(0.75 0.18 75)"
                  : "transparent",
              }}
            />
          </div>
        </div>

        {/* Approval Chain Steps */}
        <div className="space-y-4">
          {approvalChain.map((step, index) => (
            <div key={`${step.role}-${index}`} className="space-y-3">
              {/* Step Header */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 pt-1">
                  {getStatusIcon(step.status)}
                  {index < approvalChain.length - 1 && (
                    <div className="w-0.5 h-12" style={{ background: "oklch(0.22 0.02 260)" }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold capitalize">{step.role}</span>
                    {getStatusBadge(step.status)}
                  </div>

                  {step.status !== "pending" && step.approvedBy && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.55 0.02 260)" }}>
                      <User className="w-4 h-4" />
                      <span>{step.approvedBy}</span>
                      {step.approvedAt && (
                        <>
                          <span>•</span>
                          <span>{format(step.approvedAt, "MMM d, h:mm a")}</span>
                        </>
                      )}
                    </div>
                  )}

                  {step.comment && (
                    <p className="text-sm mt-2 p-2 rounded" style={{ background: "oklch(0.15 0.01 260)" }}>
                      {step.comment}
                    </p>
                  )}

                  {/* Action Buttons for Pending Steps */}
                  {step.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => onApprove?.(step.role)}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        style={{
                          borderColor: "oklch(0.6 0.22 25 / 0.4)",
                          color: "oklch(0.7 0.22 25)",
                        }}
                        onClick={() => onReject?.(step.role, "Rejected by approver")}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            background: allApprovalsReceived ? "oklch(0.68 0.2 145 / 0.1)" : "oklch(0.75 0.18 75 / 0.1)",
            borderLeft: `3px solid ${allApprovalsReceived ? "oklch(0.68 0.2 145)" : "oklch(0.75 0.18 75)"}`,
          }}
        >
          {allApprovalsReceived ? (
            <p style={{ color: "oklch(0.75 0.2 145)" }}>
              ✓ All required approvals received. Ready for execution.
            </p>
          ) : (
            <p style={{ color: "oklch(0.75 0.18 75)" }}>
              Waiting for approval from: <strong>{pendingRoles.join(", ")}</strong>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
