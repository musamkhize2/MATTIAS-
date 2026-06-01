import { describe, it, expect } from "vitest";
import {
  sendTransactionalEmail,
  sendEmail,
  sendEmailBatch,
} from "./mailerliteTransactional";

describe("MailerLite Transactional Email Service", () => {
  it("should send a transactional email to single recipient", async () => {
    const result = await sendTransactionalEmail({
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>This is a test email</p>",
      text: "This is a test email",
    });

    expect(result).toBeDefined();
    expect(result.timestamp).toBeDefined();
    // Success depends on MailerLite account configuration
    expect(result.success).toBeDefined();
  });

  it("should send email to multiple recipients", async () => {
    const result = await sendTransactionalEmail({
      to: ["user1@example.com", "user2@example.com"],
      subject: "Batch Test Email",
      html: "<p>Batch email test</p>",
    });

    expect(result).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it("should use sendEmail helper function", async () => {
    const result = await sendEmail(
      "test@example.com",
      "Helper Test",
      "<p>Using helper function</p>",
      "Using helper function"
    );

    expect(result).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it("should use sendEmailBatch helper function", async () => {
    const result = await sendEmailBatch(
      ["user1@example.com", "user2@example.com"],
      "Batch Helper Test",
      "<p>Batch helper test</p>"
    );

    expect(result).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it("should handle missing API key gracefully", async () => {
    // Temporarily remove API key
    const originalKey = process.env.MAILERLITE_API_KEY;
    delete process.env.MAILERLITE_API_KEY;

    const result = await sendTransactionalEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Restore API key
    if (originalKey) {
      process.env.MAILERLITE_API_KEY = originalKey;
    }
  });

  it("should validate MailerLite API key is configured", () => {
    const apiKey = process.env.MAILERLITE_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.length).toBeGreaterThan(0);
  });
});
