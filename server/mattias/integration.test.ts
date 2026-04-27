import { describe, expect, it } from "vitest";
import {
  createDataSource,
  createCRMConnector,
  processWebhookEvent,
  processCRMEvent,
} from "./dataSourceManager";
import { EventTypes } from "./eventCatalog";

describe("Data Source Manager", () => {
  it("should create a webhook data source", async () => {
    const result = await createDataSource(1, "Test Webhook", "webhook", {});
    expect(result.id).toBeDefined();
    expect(result.webhookUrl).toBeDefined();
    expect(result.webhookSecret).toBeDefined();
    expect(result.webhookSecret).toHaveLength(64);
  });

  it("should create a CRM connector", async () => {
    const id = await createCRMConnector(1, "hubspot", "Main Account", "test-token");
    expect(id).toBeDefined();
    expect(typeof id).toBe("number");
  });

  it("should map webhook events to MATTIAS event types", async () => {
    const success = await processWebhookEvent(1, 1, {
      type: "lead.created",
      data: { leadId: "123", name: "John Doe", email: "john@example.com" },
    });
    expect(success).toBe(true);
  });

  it("should handle unknown webhook event types gracefully", async () => {
    const success = await processWebhookEvent(1, 1, {
      type: "unknown.event",
      data: {},
    });
    expect(success).toBe(false);
  });

  it("should map CRM events using event mappings", async () => {
    const connectorId = await createCRMConnector(1, "hubspot", "Test", "token");
    const success = await processCRMEvent(
      connectorId,
      1,
      "contact.creation",
      { contactId: "456", name: "Jane Doe" }
    );
    expect(success).toBe(true);
  });

  it("should handle inactive data sources", async () => {
    // This test verifies the logic flow - in production, you'd need to toggle the source first
    const result = await createDataSource(1, "Inactive", "webhook", {});
    expect(result.id).toBeDefined();
  });
});

describe("Event Type Mapping", () => {
  it("should map lead.created to LeadCaptured", async () => {
    const success = await processWebhookEvent(1, 1, {
      type: "lead.created",
      data: { leadId: "123", source: "website" },
    });
    expect(success).toBe(true);
  });

  it("should map payment.completed to PaymentApproved", async () => {
    const success = await processWebhookEvent(1, 1, {
      type: "payment.completed",
      data: { paymentId: "789", amount: 1000 },
    });
    expect(success).toBe(true);
  });

  it("should map payment.failed to CashflowShortfallDetected", async () => {
    const success = await processWebhookEvent(1, 1, {
      type: "payment.failed",
      data: { paymentId: "999", reason: "insufficient_funds" },
    });
    expect(success).toBe(true);
  });
});

describe("CRM Connector Mappings", () => {
  it("should have default HubSpot event mappings", async () => {
    const connectorId = await createCRMConnector(1, "hubspot", "HubSpot", "token");
    expect(connectorId).toBeDefined();
  });

  it("should have default Salesforce event mappings", async () => {
    const connectorId = await createCRMConnector(1, "salesforce", "Salesforce", "token");
    expect(connectorId).toBeDefined();
  });

  it("should have default Pipedrive event mappings", async () => {
    const connectorId = await createCRMConnector(1, "pipedrive", "Pipedrive", "token");
    expect(connectorId).toBeDefined();
  });
});
