import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDomainConfig,
  updateDomainConfig,
  validateDomain,
  generateWebhookUrl,
  generateMailerLiteWebhookUrl,
} from "./domainConfig";
import * as db from "../db";

// Mock database
vi.mock("../db");

describe("domainConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateDomain", () => {
    it("should validate correct domain names", () => {
      expect(validateDomain("example.com")).toBe(true);
      expect(validateDomain("subdomain.example.com")).toBe(true);
      expect(validateDomain("my-domain.co.uk")).toBe(true);
    });

    it("should reject invalid domain names", () => {
      expect(validateDomain("invalid")).toBe(false);
      expect(validateDomain("invalid..com")).toBe(false);
      expect(validateDomain("-invalid.com")).toBe(false);
      expect(validateDomain("invalid-.com")).toBe(false);
    });
  });

  describe("getDomainConfig", () => {
    it("should retrieve domain configuration for tenant", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  name: "Test Tenant",
                  features: {
                    customDomain: "custom.example.com",
                    notificationEmail: "admin@example.com",
                    slackWebhookUrl: "https://hooks.slack.com/test",
                  },
                },
              ]),
            }),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const config = await getDomainConfig(1);

      expect(config.tenantId).toBe(1);
      expect(config.customDomain).toBe("custom.example.com");
      expect(config.webhookBaseUrl).toBe("https://custom.example.com");
      expect(config.notificationEmail).toBe("admin@example.com");
      expect(config.slackWebhookUrl).toBe("https://hooks.slack.com/test");
    });

    it("should use default webhook URL if no custom domain", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  name: "Test Tenant",
                  features: {},
                },
              ]),
            }),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const config = await getDomainConfig(1);

      expect(config.webhookBaseUrl).toContain("manus.space");
    });

    it("should throw error if tenant not found", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      await expect(getDomainConfig(999)).rejects.toThrow("Tenant 999 not found");
    });
  });

  describe("updateDomainConfig", () => {
    it("should update domain configuration", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValueOnce([
                  {
                    id: 1,
                    name: "Test Tenant",
                    features: {},
                  },
                ])
                .mockResolvedValueOnce([
                  {
                    id: 1,
                    name: "Test Tenant",
                    features: {
                      customDomain: "new.example.com",
                    },
                  },
                ]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const config = await updateDomainConfig(1, {
        customDomain: "new.example.com",
      });

      expect(config.customDomain).toBe("new.example.com");
    });
  });

  describe("generateWebhookUrl", () => {
    it("should generate webhook URL for campaign", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  name: "Test Tenant",
                  features: {
                    customDomain: "custom.example.com",
                  },
                },
              ]),
            }),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const url = await generateWebhookUrl(1, "camp-123", "open");

      expect(url).toBe("https://custom.example.com/api/webhooks/campaigns/camp-123/open");
    });
  });

  describe("generateMailerLiteWebhookUrl", () => {
    it("should generate MailerLite webhook URL", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  name: "Test Tenant",
                  features: {
                    customDomain: "custom.example.com",
                  },
                },
              ]),
            }),
          }),
        }),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const url = await generateMailerLiteWebhookUrl(1);

      expect(url).toBe("https://custom.example.com/api/webhooks/mailerlite");
    });
  });
});
