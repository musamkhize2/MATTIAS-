import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebhookEvent {
  id: string;
  eventType: string;
  status: "pending" | "delivered" | "failed" | "bounced";
  timestamp: Date;
  integrationName: string;
  message?: string;
  retryCount?: number;
}

/**
 * WebhookEventStream Component
 * Real-time webhook event monitoring with live updates
 */
export const WebhookEventStream: React.FC = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      // In production, replace with actual WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/webhooks/stream`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const webhookEvent: WebhookEvent = {
            id: data.id || `event-${Date.now()}`,
            eventType: data.eventType || "unknown",
            status: data.status || "pending",
            timestamp: new Date(data.timestamp || Date.now()),
            integrationName: data.integrationName || "Unknown",
            message: data.message,
            retryCount: data.retryCount || 0,
          };

          setEvents((prev) => [webhookEvent, ...prev.slice(0, 49)]);
        } catch (error) {
          console.warn("[WebSocket] Failed to parse message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };
    } catch (error) {
      console.error("[WebSocket] Connection failed:", error);
      setIsConnected(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "bounced":
        return <X className="w-4 h-4 text-orange-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Zap className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-900/20 border-green-700 text-green-300";
      case "failed":
        return "bg-red-900/20 border-red-700 text-red-300";
      case "bounced":
        return "bg-orange-900/20 border-orange-700 text-orange-300";
      case "pending":
        return "bg-yellow-900/20 border-yellow-700 text-yellow-300";
      default:
        return "bg-slate-700/20 border-slate-600 text-slate-300";
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Live Webhook Events</h2>
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={connectWebSocket}
          disabled={isConnected}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reconnect
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Zap className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
          <p className="text-slate-400 text-sm">
            {isConnected
              ? "Waiting for webhook events..."
              : "Connecting to event stream..."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-lg p-3 border flex items-start justify-between ${getStatusColor(
                event.status
              )}`}
            >
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(event.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">
                      {event.integrationName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {event.eventType}
                    </Badge>
                  </div>
                  {event.message && (
                    <p className="text-xs opacity-75 truncate">
                      {event.message}
                    </p>
                  )}
                  <p className="text-xs opacity-50 mt-1">
                    {event.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {event.retryCount && event.retryCount > 0 && (
                <Badge variant="outline" className="text-xs ml-2">
                  Retry {event.retryCount}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400">
          Total events: <span className="font-semibold">{events.length}</span>
        </p>
      </div>
    </Card>
  );
};

export default WebhookEventStream;
