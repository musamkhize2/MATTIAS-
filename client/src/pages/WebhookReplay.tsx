import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function WebhookReplay() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [replayResults, setReplayResults] = useState<Record<string, { status: "pending" | "success" | "error"; message: string }>>({});

  const { data: events, isLoading } = trpc.events.list.useQuery({ limit: 100 });
  const replayMutation = trpc.webhookReplay.replayEvent.useMutation();

  const handleReplayEvent = async (eventId: string) => {
    setReplayResults((prev) => ({
      ...prev,
      [eventId]: { status: "pending", message: "Replaying..." },
    }));

    try {
      await replayMutation.mutateAsync({ eventId });

      setReplayResults((prev) => ({
        ...prev,
        [eventId]: { status: "success", message: "Event replayed successfully" },
      }));

      toast.success("Event replayed successfully");
    } catch (error) {
      setReplayResults((prev) => ({
        ...prev,
        [eventId]: { status: "error", message: "Failed to replay event" },
      }));

      toast.error("Failed to replay event");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Webhook Replay</h1>
        <p className="text-muted-foreground">Re-trigger past webhook events through the orchestration pipeline for testing and debugging</p>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading events...</p>
        ) : events && events.length > 0 ? (
          events.map((event) => {
            const replayStatus = replayResults[event.id];
            return (
              <Card key={event.id} className="p-4 border-border bg-card hover:bg-card/80 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-card-foreground">{event.eventType}</h3>
                      <Badge variant="outline" className="text-xs">
                        {event.source}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {new Date(event.occurrenceTime).toLocaleString()}
                    </p>

                    {/* Event Payload Preview */}
                    <div className="p-2 rounded bg-background border border-border mb-3 max-h-24 overflow-y-auto">
                      <p className="text-xs font-mono text-muted-foreground">
                        {JSON.stringify(event.data || {}, null, 2).slice(0, 200)}
                        {JSON.stringify(event.data || {}).length > 200 ? "..." : ""}
                      </p>
                    </div>

                    {/* Replay Status */}
                    {replayStatus && (
                      <div className="flex items-center gap-2 text-sm">
                        {replayStatus.status === "pending" && (
                          <>
                            <Loader2 size={14} className="animate-spin text-yellow-500" />
                            <span className="text-muted-foreground">{replayStatus.message}</span>
                          </>
                        )}
                        {replayStatus.status === "success" && (
                          <>
                            <CheckCircle size={14} className="text-green-500" />
                            <span className="text-green-500">{replayStatus.message}</span>
                          </>
                        )}
                        {replayStatus.status === "error" && (
                          <>
                            <AlertCircle size={14} className="text-red-500" />
                            <span className="text-red-500">{replayStatus.message}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleReplayEvent(String(event.id))}
                    disabled={replayStatus?.status === "pending" || replayMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {replayStatus?.status === "pending" || replayMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Replaying...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={14} />
                        Replay
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-6 border-border bg-card text-center">
            <p className="text-muted-foreground">No events available for replay</p>
          </Card>
        )}
      </div>

      {/* Info Box */}
      <Card className="p-4 border-border bg-accent/5">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Replaying an event will re-trigger the full orchestration pipeline, allowing agents to reason over the event again. This is useful for testing policy changes or debugging agent behavior.
        </p>
      </Card>
    </div>
  );
}
