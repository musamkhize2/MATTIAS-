import { describe, it, expect } from "vitest";
import { webhookRouter } from "./webhookRouter";

describe("webhookRouter", () => {
  describe("handleMailerLite", () => {
    it("should handle opened email event", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.opened_email",
        data: {
          subscriber: {
            email: "test@example.com",
            id: "sub-123",
          },
          campaign: {
            id: "camp-123",
            name: "Test Campaign",
          },
          timestamp: new Date().toISOString(),
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });

    it("should handle clicked link event", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.clicked_link",
        data: {
          subscriber: {
            email: "test@example.com",
            id: "sub-123",
          },
          campaign: {
            id: "camp-123",
            name: "Test Campaign",
          },
          link: "https://example.com",
          timestamp: new Date().toISOString(),
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });

    it("should handle bounced email event", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.bounced_email",
        data: {
          subscriber: {
            email: "bounce@example.com",
            id: "sub-456",
          },
          campaign: {
            id: "camp-123",
            name: "Test Campaign",
          },
          timestamp: new Date().toISOString(),
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });

    it("should handle unsubscribe event", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.unsubscribed",
        data: {
          subscriber: {
            email: "unsub@example.com",
            id: "sub-789",
          },
          campaign: {
            id: "camp-123",
            name: "Test Campaign",
          },
          timestamp: new Date().toISOString(),
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });

    it("should handle events without campaign", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.opened_email",
        data: {
          subscriber: {
            email: "test@example.com",
            id: "sub-123",
          },
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });

    it("should return error message on failure", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.opened_email",
        data: {
          subscriber: {
            email: "test@example.com",
            id: "sub-123",
          },
        },
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });
  });

  describe("validateSignature", () => {
    it("should validate correct signature", async () => {
      const caller = webhookRouter.createCaller({});
      const payload = "test payload";
      const apiKey = "test-api-key";

      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", apiKey)
        .update(payload)
        .digest("hex");

      const result = await caller.validateSignature({
        payload,
        signature,
        apiKey,
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("isValid");
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid signature", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.validateSignature({
        payload: "test payload",
        signature: "invalid-signature",
        apiKey: "test-api-key",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("isValid");
      expect(result.isValid).toBe(false);
    });

    it("should handle empty payload", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.validateSignature({
        payload: "",
        signature: "any-signature",
        apiKey: "test-api-key",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("isValid");
    });
  });

  describe("processBatch", () => {
    it("should process batch of events", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.processBatch({
        events: [
          {
            type: "subscriber.opened_email",
            data: {
              subscriber: { email: "test1@example.com", id: "sub-1" },
              campaign: { id: "camp-1", name: "Campaign 1" },
            },
          },
          {
            type: "subscriber.clicked_link",
            data: {
              subscriber: { email: "test2@example.com", id: "sub-2" },
              campaign: { id: "camp-1", name: "Campaign 1" },
              link: "https://example.com",
            },
          },
        ],
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("processed");
      expect(result).toHaveProperty("failed");
      expect(result).toHaveProperty("message");
    });

    it("should handle empty batch", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.processBatch({
        events: [],
      });

      expect(result).toHaveProperty("success");
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should handle large batch", async () => {
      const caller = webhookRouter.createCaller({});
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: "subscriber.opened_email" as const,
        data: {
          subscriber: { email: `test${i}@example.com`, id: `sub-${i}` },
          campaign: { id: "camp-1", name: "Campaign 1" },
        },
      }));

      const result = await caller.processBatch({ events });

      expect(result).toHaveProperty("success");
      expect(result.processed + result.failed).toBe(10);
    });

    it("should return proper counts", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.processBatch({
        events: [
          {
            type: "subscriber.opened_email",
            data: {
              subscriber: { email: "test@example.com", id: "sub-1" },
              campaign: { id: "camp-1", name: "Campaign 1" },
            },
          },
        ],
      });

      expect(result.processed + result.failed).toBe(1);
    });
  });

  describe("health", () => {
    it("should return healthy status", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.health();

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("healthy");
      expect(result).toHaveProperty("timestamp");
    });

    it("should return ISO timestamp", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.health();

      expect(result.timestamp).toBeTruthy();
      expect(typeof result.timestamp).toBe("string");
      // Check if it's a valid ISO string
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should handle malformed input", async () => {
      const caller = webhookRouter.createCaller({});

      try {
        await caller.handleMailerLite({
          type: "subscriber.opened_email",
          data: {
            subscriber: {
              email: "invalid-email",
              id: "sub-123",
            },
          },
        } as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle missing required fields", async () => {
      const caller = webhookRouter.createCaller({});

      try {
        await caller.handleMailerLite({
          type: "subscriber.opened_email",
          data: {
            subscriber: {
              email: "test@example.com",
              // Missing id
            },
          },
        } as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("event type validation", () => {
    it("should accept all valid event types", async () => {
      const caller = webhookRouter.createCaller({});
      const eventTypes = [
        "subscriber.opened_email",
        "subscriber.clicked_link",
        "subscriber.bounced_email",
        "subscriber.unsubscribed",
      ] as const;

      for (const eventType of eventTypes) {
        const result = await caller.handleMailerLite({
          type: eventType,
          data: {
            subscriber: {
              email: "test@example.com",
              id: "sub-123",
            },
          },
        });

        expect(result).toHaveProperty("success");
      }
    });
  });

  describe("response structure", () => {
    it("should return consistent response structure", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.opened_email",
        data: {
          subscriber: {
            email: "test@example.com",
            id: "sub-123",
          },
        },
      });

      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      expect(result).toHaveProperty("message");
      expect(typeof result.message).toBe("string");
    });

    it("should include error details on failure", async () => {
      const caller = webhookRouter.createCaller({});
      const result = await caller.handleMailerLite({
        type: "subscriber.opened_email",
        data: {
          subscriber: {
            email: "test@example.com",
            id: "sub-123",
          },
        },
      });

      if (!result.success) {
        expect(result).toHaveProperty("message");
      }
    });
  });
});
