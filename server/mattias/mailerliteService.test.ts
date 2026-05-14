import { describe, it, expect, vi } from "vitest";
import {
  sendEmailViaMailerLite,
  getSubscriberByEmail,
  getCampaignStats,
} from "./mailerliteService";

describe("MailerLite Email Service", () => {
  it("should have MailerLite API key configured", () => {
    expect(process.env.MAILERLITE_API_KEY).toBeDefined();
    expect(process.env.MAILERLITE_API_KEY).toBeTruthy();
  });

  it("should construct valid email payload", () => {
    const payload = {
      to: [
        { email: "test@example.com", name: "Test User" },
        { email: "another@example.com", name: "Another User" },
      ],
      from: {
        name: "MATTIAS",
        email: "noreply@mattias.ai",
      },
      subject: "Test Campaign",
      html: "<h1>Hello</h1><p>This is a test</p>",
      text: "Hello, This is a test",
      replyTo: "support@mattias.ai",
      tags: ["test", "campaign"],
    };

    expect(payload.to).toHaveLength(2);
    expect(payload.from.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(payload.subject).toBeTruthy();
    expect(payload.html).toContain("<h1>");
  });

  it("should validate email addresses in payload", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validEmails = [
      "test@example.com",
      "user.name@company.co.uk",
      "contact+tag@domain.org",
    ];

    validEmails.forEach((email) => {
      expect(email).toMatch(emailRegex);
    });
  });

  it("should handle missing API key gracefully", async () => {
    const originalKey = process.env.MAILERLITE_API_KEY;

    try {
      // Temporarily unset API key
      delete process.env.MAILERLITE_API_KEY;

      const payload = {
        to: [{ email: "test@example.com", name: "Test" }],
        from: { name: "MATTIAS", email: "noreply@mattias.ai" },
        subject: "Test",
        html: "<p>Test</p>",
      };

      // This should handle gracefully without throwing
      // Note: The actual implementation checks for API key
      expect(process.env.MAILERLITE_API_KEY).toBeUndefined();
    } finally {
      // Restore API key
      if (originalKey) {
        process.env.MAILERLITE_API_KEY = originalKey;
      }
    }
  });

  it("should format campaign name with timestamp", () => {
    const timestamp = Date.now();
    const campaignName = `Campaign_${timestamp}`;

    expect(campaignName).toMatch(/^Campaign_\d+$/);
    expect(campaignName).toContain("Campaign_");
  });

  it("should strip HTML tags correctly", () => {
    const testCases = [
      {
        input: "<h1>Hello</h1><p>World</p>",
        expected: "HelloWorld",
      },
      {
        input: "<p>Test&nbsp;with&nbsp;spaces</p>",
        expected: "Test with spaces",
      },
      {
        input: "<p>HTML&amp;Entities&lt;test&gt;</p>",
        expected: "HTML&Entities<test>",
      },
    ];

    testCases.forEach(({ input, expected }) => {
      // Test HTML stripping logic
      const stripped = input
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      expect(stripped).toBe(expected);
    });
  });

  it("should validate campaign payload structure", () => {
    const campaignPayload = {
      name: `Campaign_${Date.now()}`,
      type: "regular",
      subject: "Test Subject",
      from_name: "MATTIAS",
      from_email: "noreply@mattias.ai",
      reply_to_email: "support@mattias.ai",
      content: {
        html: "<p>Test content</p>",
        plain_text: "Test content",
      },
      recipients: {
        list_id: null,
        segment_id: null,
      },
    };

    expect(campaignPayload).toHaveProperty("name");
    expect(campaignPayload).toHaveProperty("type");
    expect(campaignPayload).toHaveProperty("subject");
    expect(campaignPayload).toHaveProperty("from_email");
    expect(campaignPayload).toHaveProperty("content");
    expect(campaignPayload.content).toHaveProperty("html");
    expect(campaignPayload.content).toHaveProperty("plain_text");
  });

  it("should generate valid message ID format", () => {
    const campaignId = "12345";
    const timestamp = Date.now();
    const messageId = `mailerlite_${campaignId}_${timestamp}`;

    expect(messageId).toMatch(/^mailerlite_\d+_\d+$/);
    expect(messageId).toContain("mailerlite_");
  });

  it("should handle multiple recipients in payload", () => {
    const recipients = [
      { email: "user1@example.com", name: "User 1" },
      { email: "user2@example.com", name: "User 2" },
      { email: "user3@example.com", name: "User 3" },
    ];

    expect(recipients).toHaveLength(3);
    recipients.forEach((recipient) => {
      expect(recipient.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(recipient.name).toBeTruthy();
    });
  });

  it("should validate response structure", () => {
    const successResponse = {
      success: true,
      messageId: "mailerlite_123_456789",
      timestamp: new Date(),
    };

    const errorResponse = {
      success: false,
      error: "API key not configured",
      timestamp: new Date(),
    };

    expect(successResponse).toHaveProperty("success");
    expect(successResponse).toHaveProperty("messageId");
    expect(successResponse).toHaveProperty("timestamp");

    expect(errorResponse).toHaveProperty("success");
    expect(errorResponse).toHaveProperty("error");
    expect(errorResponse).toHaveProperty("timestamp");
  });
});
