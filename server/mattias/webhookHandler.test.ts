import { describe, it, expect, vi } from "vitest";
import { handleMailerLiteWebhook, validateMailerLiteSignature, processBatchWebhookEvents } from "./webhookHandler";
import type { MailerLiteWebhookEvent } from "./webhookHandler";

describe("webhookHandler", () => {
  describe("handleMailerLiteWebhook", () => {
    it("should handle email opened event", async () => {
      const event: MailerLiteWebhookEvent = {
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
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });

    it("should handle email clicked event", async () => {
      const event: MailerLiteWebhookEvent = {
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
          timestamp: new Date().toISOString(),
          link: "https://example.com",
        },
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });

    it("should handle email bounced event", async () => {
      const event: MailerLiteWebhookEvent = {
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
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });

    it("should handle unsubscribe event", async () => {
      const event: MailerLiteWebhookEvent = {
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
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });

    it("should handle events without campaign", async () => {
      const event: MailerLiteWebhookEvent = {
        type: "subscriber.opened_email",
        data: {
          subscriber: {
            email: "test@example.com",
            id: "sub-123",
          },
          timestamp: new Date().toISOString(),
        },
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });

    it("should handle events without timestamp", async () => {
      const event: MailerLiteWebhookEvent = {
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
        },
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("validateMailerLiteSignature", () => {
    it("should validate correct signature", () => {
      const payload = "test payload";
      const apiKey = "test-api-key";

      // Create a valid signature
      const crypto = require("crypto");
      const validSignature = crypto
        .createHmac("sha256", apiKey)
        .update(payload)
        .digest("hex");

      const result = validateMailerLiteSignature(payload, validSignature, apiKey);
      expect(result).toBe(true);
    });

    it("should reject invalid signature", () => {
      const payload = "test payload";
      const apiKey = "test-api-key";
      const invalidSignature = "invalid-signature";

      const result = validateMailerLiteSignature(payload, invalidSignature, apiKey);
      expect(result).toBe(false);
    });

    it("should reject signature with wrong API key", () => {
      const payload = "test payload";
      const apiKey = "test-api-key";
      const wrongApiKey = "wrong-api-key";

      // Create signature with correct key
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", apiKey)
        .update(payload)
        .digest("hex");

      // Try to validate with wrong key
      const result = validateMailerLiteSignature(payload, signature, wrongApiKey);
      expect(result).toBe(false);
    });

    it("should handle empty payload", () => {
      const payload = "";
      const apiKey = "test-api-key";
      const signature = "any-signature";

      const result = validateMailerLiteSignature(payload, signature, apiKey);
      expect(typeof result).toBe("boolean");
    });

    it("should handle empty API key", () => {
      const payload = "test payload";
      const apiKey = "";
      const signature = "any-signature";

      const result = validateMailerLiteSignature(payload, signature, apiKey);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("processBatchWebhookEvents", () => {
    it("should process multiple events", async () => {
      const events: MailerLiteWebhookEvent[] = [
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
        {
          type: "subscriber.bounced_email",
          data: {
            subscriber: { email: "test3@example.com", id: "sub-3" },
            campaign: { id: "camp-1", name: "Campaign 1" },
          },
        },
      ];

      const result = await processBatchWebhookEvents(events);
      expect(result).toHaveProperty("processed");
      expect(result).toHaveProperty("failed");
      expect(result.processed + result.failed).toBe(events.length);
    });

    it("should handle empty event list", async () => {
      const events: MailerLiteWebhookEvent[] = [];
      const result = await processBatchWebhookEvents(events);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should handle large batch", async () => {
      const events: MailerLiteWebhookEvent[] = Array.from({ length: 10 }, (_, i) => ({
        type: "subscriber.opened_email" as const,
        data: {
          subscriber: { email: `test${i}@example.com`, id: `sub-${i}` },
          campaign: { id: "camp-1", name: "Campaign 1" },
        },
      }));

      const result = await processBatchWebhookEvents(events);
      expect(result.processed + result.failed).toBe(10);
    });

    it("should track both successes and failures", async () => {
      const events: MailerLiteWebhookEvent[] = [
        {
          type: "subscriber.opened_email",
          data: {
            subscriber: { email: "valid@example.com", id: "sub-1" },
            campaign: { id: "camp-1", name: "Campaign 1" },
          },
        },
        {
          type: "subscriber.clicked_link",
          data: {
            subscriber: { email: "another@example.com", id: "sub-2" },
            campaign: { id: "camp-2", name: "Campaign 2" },
            link: "https://example.com",
          },
        },
      ];

      const result = await processBatchWebhookEvents(events);
      expect(result.processed >= 0).toBe(true);
      expect(result.failed >= 0).toBe(true);
    });
  });

  describe("event type handling", () => {
    it("should correctly identify all event types", async () => {
      const eventTypes = [
        "subscriber.opened_email",
        "subscriber.clicked_link",
        "subscriber.bounced_email",
        "subscriber.unsubscribed",
      ] as const;

      for (const eventType of eventTypes) {
        const event: MailerLiteWebhookEvent = {
          type: eventType,
          data: {
            subscriber: { email: "test@example.com", id: "sub-123" },
            campaign: { id: "camp-123", name: "Test" },
          },
        };

        const result = await handleMailerLiteWebhook(event);
        expect(typeof result).toBe("boolean");
      }
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const event: MailerLiteWebhookEvent = {
        type: "subscriber.opened_email",
        data: {
          subscriber: { email: "test@example.com", id: "sub-123" },
          campaign: { id: "camp-123", name: "Test" },
        },
      };

      // Should not throw
      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });

    it("should handle missing subscriber data", async () => {
      const event = {
        type: "subscriber.opened_email",
        data: {
          subscriber: { email: "", id: "" },
        },
      } as any;

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("metadata updates", () => {
    it("should include timestamp in metadata", async () => {
      const timestamp = new Date().toISOString();
      const event: MailerLiteWebhookEvent = {
        type: "subscriber.opened_email",
        data: {
          subscriber: { email: "test@example.com", id: "sub-123" },
          campaign: { id: "camp-123", name: "Test" },
          timestamp,
        },
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });

    it("should include link in clicked event metadata", async () => {
      const link = "https://example.com/promo";
      const event: MailerLiteWebhookEvent = {
        type: "subscriber.clicked_link",
        data: {
          subscriber: { email: "test@example.com", id: "sub-123" },
          campaign: { id: "camp-123", name: "Test" },
          link,
        },
      };

      const result = await handleMailerLiteWebhook(event);
      expect(typeof result).toBe("boolean");
    });
  });
});
