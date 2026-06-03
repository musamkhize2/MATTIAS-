import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { getDb } from "./db";
import { webhookEventLog } from "../drizzle/schema";
import { desc } from "drizzle-orm";

interface WebSocketClient {
  ws: WebSocket;
  isAlive: boolean;
}

const clients = new Set<WebSocketClient>();

export function setupWebhookStream(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: false,
  });

  // Handle upgrade requests
  server.on("upgrade", (request: IncomingMessage, socket: any, head: any) => {
    if (request.url === "/api/webhooks/stream") {
      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        handleWebSocketConnection(ws);
      });
    } else {
      socket.destroy();
    }
  });

  // Health check interval to detect stale connections
  const healthCheckInterval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000); // 30 seconds

  // Cleanup on server close
  server.on("close", () => {
    clearInterval(healthCheckInterval);
    clients.forEach((client) => {
      client.ws.close();
    });
    clients.clear();
  });

  return wss;
}

function handleWebSocketConnection(ws: WebSocket) {
  const client: WebSocketClient = {
    ws,
    isAlive: true,
  };

  clients.add(client);

  // Handle pong responses
  ws.on("pong", () => {
    client.isAlive = true;
  });

  // Send initial connection message
  ws.send(JSON.stringify({
    type: "connected",
    timestamp: new Date().toISOString(),
    message: "Connected to webhook event stream",
  }));

  // Send recent events on connection
  sendRecentEvents(ws);

  // Handle incoming messages (for filtering/subscriptions)
  ws.on("message", (data: any) => {
    try {
      const message = JSON.parse(data.toString());
      handleClientMessage(ws, message);
    } catch (error: any) {
      console.error("Failed to parse WebSocket message:", error);
      ws.send(JSON.stringify({
        type: "error",
        message: "Invalid message format",
      }));
    }
  });

  // Handle client disconnect
  ws.on("close", () => {
    clients.delete(client);
  });

  // Handle errors
  ws.on("error", (error: any) => {
    console.error("WebSocket error:", error);
    clients.delete(client);
  });
}

async function sendRecentEvents(ws: WebSocket) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
    const recentEvents = await db
      .select()
      .from(webhookEventLog)
      .orderBy(desc(webhookEventLog.createdAt))
      .limit(50);

    ws.send(JSON.stringify({
      type: "recent_events",
      events: recentEvents,
      count: recentEvents.length,
    }));
  } catch (error: any) {
    console.error("Failed to send recent events:", error);
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to load recent events",
    }));
  }
}

function handleClientMessage(ws: WebSocket, message: Record<string, any>) {
  switch (message.type) {
    case "subscribe":
      // Subscribe to specific event types
      ws.send(JSON.stringify({
        type: "subscribed",
        eventTypes: message.eventTypes || [],
      }));
      break;

    case "unsubscribe":
      ws.send(JSON.stringify({
        type: "unsubscribed",
        eventTypes: message.eventTypes || [],
      }));
      break;

    case "ping":
      ws.send(JSON.stringify({
        type: "pong",
        timestamp: new Date().toISOString(),
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: "error",
        message: "Unknown message type",
      }));
  }
}

// Broadcast new webhook event to all connected clients
export function broadcastWebhookEvent(event: any) {
  const message = JSON.stringify({
    type: "webhook_event",
    event,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}
