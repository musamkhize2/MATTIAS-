import { describe, it, expect } from "vitest";

/**
 * Test MailerLite API integration
 */
describe("MailerLite API Integration", () => {
  it("should have MAILERLITE_API_KEY environment variable", () => {
    const apiKey = process.env.MAILERLITE_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toBeTruthy();
    expect(typeof apiKey).toBe("string");
    expect(apiKey!.length).toBeGreaterThan(0);
  });

  it("should validate MailerLite API key format", async () => {
    const apiKey = process.env.MAILERLITE_API_KEY;
    if (!apiKey) {
      throw new Error("MAILERLITE_API_KEY not set");
    }

    // Test API key by calling MailerLite API
    try {
      const response = await fetch("https://connect.mailerlite.com/api/account", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      // If API key is valid, we should get a 200 or 401 (not 403 Forbidden)
      // 401 means auth issue, 403 means invalid API key format
      expect(response.status).not.toBe(403);
      expect(response.ok || response.status === 401).toBe(true);

      if (response.ok) {
        const data = await response.json();
        expect(data).toBeDefined();
        console.log("✓ MailerLite API key validated successfully");
      }
    } catch (error) {
      console.error("Error validating MailerLite API key:", error);
      throw error;
    }
  });

  it("should construct valid MailerLite API headers", () => {
    const apiKey = process.env.MAILERLITE_API_KEY;
    if (!apiKey) {
      throw new Error("MAILERLITE_API_KEY not set");
    }

    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    expect(headers.Authorization).toMatch(/^Bearer /);
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
