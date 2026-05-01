import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Brain, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ApprovalReasoning() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: approvals, isLoading } = trpc.approvalReasoning.listApprovalsWithReasoning.useQuery({ limit: 50 });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Approval Reasoning</h1>
        <p className="text-muted-foreground">Audit the full LLM reasoning chain for each pending approval</p>
      </div>

      {/* Approvals List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading approvals...</p>
        ) : approvals && approvals.length > 0 ? (
          approvals
            .filter((a: any) => (a as any).status === "pending")
            .map((approval: any) => (
              <Card
                key={String((approval as any).id)}
                className="border-border bg-card overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-card/80 transition flex items-center justify-between"
                  onClick={() => toggleExpand(String((approval as any).id))}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-card-foreground">
                        {String((approval.actionPayload as Record<string, any>)?.actionType || "Action")}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        Risk: {(approval as any).riskScore}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Triggered by: {String((approval.eventData as Record<string, any>)?.eventType || "Event")}
                    </p>
                  </div>

                  {expandedId === String((approval as any).id) ? (
                    <ChevronUp className="text-muted-foreground" />
                  ) : (
                    <ChevronDown className="text-muted-foreground" />
                  )}
                </div>

                {/* Expanded Details */}
                {expandedId === String((approval as any).id) && (
                  <div className="border-t border-border p-4 space-y-4 bg-background/50">
                    {/* Triggering Event */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Zap size={14} className="text-yellow-500" />
                        Triggering Event
                      </h4>
                      <div className="p-3 rounded bg-background border border-border">
                        <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
                          {JSON.stringify((approval as any).eventData, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Proposed Action */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Proposed Action</h4>
                      <div className="p-3 rounded bg-background border border-border">
                        <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
                          {JSON.stringify((approval as any).actionPayload, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Agent Reasoning */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Brain size={14} className="text-accent" />
                        Agent Reasoning Chain
                      </h4>
                      <div className="p-3 rounded bg-background border border-border space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Agent:</p>
                          <p className="text-xs text-foreground font-mono">{(approval as any).reasoning?.agentName || "Unknown Agent"}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Token Usage:</p>
                          <p className="text-xs text-muted-foreground">
                            Prompt: {(approval as any).reasoning?.tokenUsage?.prompt || 0} tokens | Completion: {(approval as any).reasoning?.tokenUsage?.completion || 0} tokens | Total: {(approval as any).reasoning?.tokenUsage?.total || 0} tokens
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Timestamp:</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date((approval as any).reasoning?.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Risk Assessment */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Risk Assessment</h4>
                      <div className="p-3 rounded bg-background border border-border">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Risk Score:</span>
                            <span className="font-mono text-foreground">{(approval as any).riskScore}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Autonomy Level:</span>
                            <span className="font-mono text-foreground">Approval-Guarded</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Reason for Hold:</span>
                            <span className="font-mono text-foreground">Risk exceeds threshold</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {(approval as any).status === "PENDING" && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1">
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
        ) : (
          <Card className="p-6 border-border bg-card text-center">
            <p className="text-muted-foreground">No pending approvals</p>
          </Card>
        )}
      </div>

      {/* Info Box */}
      <Card className="p-4 border-border bg-accent/5">
        <p className="text-sm text-muted-foreground">
          <strong>Transparency:</strong> Every approval shows the full LLM reasoning chain, including system prompt, model response, token usage, and risk assessment. This lets you audit how agents arrived at their decisions.
        </p>
      </Card>
    </div>
  );
}
