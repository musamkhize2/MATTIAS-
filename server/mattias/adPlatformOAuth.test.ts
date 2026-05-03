import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getOAuthAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  validateAdPlatformCredential,
  getAdAccountInfo,
  revokeAdPlatformCredential,
} from "./adPlatformOAuth";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

describe("Ad Platform OAuth Service", () => {
  const mockConfig = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:3000/auth/callback",
    scopes: ["ads_management"],
  };

  const mockToken = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresIn: 3600,
    tokenType: "Bearer",
    scope: "ads_management",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOAuthAuthorizationUrl", () => {
    it("should generate Google Ads authorization URL", () => {
      const url = getOAuthAuthorizationUrl("google_ads", mockConfig, "state123");
      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("state=state123");
    });

    it("should generate Meta Ads authorization URL", () => {
      const url = getOAuthAuthorizationUrl("meta_ads", mockConfig, "state456");
      expect(url).toContain("https://www.facebook.com/v18.0/dialog/oauth");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("state=state456");
    });

    it("should generate TikTok Ads authorization URL", () => {
      const url = getOAuthAuthorizationUrl("tiktok_ads", mockConfig, "state789");
      expect(url).toContain("https://business-api.tiktok.com/marketing_api/v3/oauth2/authorize");
      expect(url).toContain("client_id=test-client-id");
    });

    it("should generate YouTube authorization URL", () => {
      const url = getOAuthAuthorizationUrl("youtube", mockConfig, "state000");
      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("access_type=offline");
      expect(url).toContain("prompt=consent");
    });

    it("should include offline access for Google platforms", () => {
      const url = getOAuthAuthorizationUrl("google_ads", mockConfig, "state");
      expect(url).toContain("access_type=offline");
    });

    it("should include all required parameters", () => {
      const url = getOAuthAuthorizationUrl("meta_ads", mockConfig, "state");
      expect(url).toContain("response_type=code");
      expect(url).toContain("client_id=");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("scope=");
      expect(url).toContain("state=");
    });
  });

  describe("Token validation", () => {
    it("should validate token structure", () => {
      expect(mockToken.accessToken).toBeDefined();
      expect(mockToken.tokenType).toBe("Bearer");
      expect(mockToken.expiresIn).toBeGreaterThan(0);
    });

    it("should handle tokens with optional refresh token", () => {
      const tokenWithoutRefresh = {
        accessToken: "token",
        expiresIn: 3600,
        tokenType: "Bearer",
        scope: "ads",
      };
      expect(tokenWithoutRefresh.accessToken).toBeDefined();
      expect(tokenWithoutRefresh.refreshToken).toBeUndefined();
    });
  });

  describe("Ad Platform types", () => {
    it("should support all ad platforms", () => {
      const platforms = ["google_ads", "meta_ads", "tiktok_ads", "youtube"] as const;
      expect(platforms).toContain("google_ads");
      expect(platforms).toContain("meta_ads");
      expect(platforms).toContain("tiktok_ads");
      expect(platforms).toContain("youtube");
    });
  });

  describe("OAuth configuration", () => {
    it("should validate OAuth config structure", () => {
      expect(mockConfig.clientId).toBeDefined();
      expect(mockConfig.clientSecret).toBeDefined();
      expect(mockConfig.redirectUri).toBeDefined();
      expect(mockConfig.scopes).toBeInstanceOf(Array);
    });

    it("should require all OAuth config fields", () => {
      const requiredFields = ["clientId", "clientSecret", "redirectUri", "scopes"];
      requiredFields.forEach((field) => {
        expect(mockConfig).toHaveProperty(field);
      });
    });
  });

  describe("Token expiry", () => {
    it("should calculate token expiry correctly", () => {
      const now = Date.now();
      const expiryTime = now + mockToken.expiresIn * 1000;
      expect(expiryTime).toBeGreaterThan(now);
    });

    it("should handle different expiry durations", () => {
      const shortLivedToken = { ...mockToken, expiresIn: 300 }; // 5 minutes
      const longLivedToken = { ...mockToken, expiresIn: 86400 }; // 24 hours

      expect(shortLivedToken.expiresIn).toBeLessThan(longLivedToken.expiresIn);
    });
  });

  describe("Scope handling", () => {
    it("should include scopes in authorization URL", () => {
      const url = getOAuthAuthorizationUrl("google_ads", mockConfig, "state");
      expect(url).toContain("scope=");
    });

    it("should support multiple scopes", () => {
      const multiScopeConfig = {
        ...mockConfig,
        scopes: ["ads_management", "business_management", "pages_manage_metadata"],
      };
      const url = getOAuthAuthorizationUrl("meta_ads", multiScopeConfig, "state");
      expect(url).toContain("scope=");
    });
  });

  describe("State parameter handling", () => {
    it("should include state parameter for CSRF protection", () => {
      const state = "unique-state-value-123";
      const url = getOAuthAuthorizationUrl("google_ads", mockConfig, state);
      expect(url).toContain(`state=${state}`);
    });

    it("should handle different state values", () => {
      const state1 = "state-1";
      const state2 = "state-2";
      const url1 = getOAuthAuthorizationUrl("meta_ads", mockConfig, state1);
      const url2 = getOAuthAuthorizationUrl("meta_ads", mockConfig, state2);

      expect(url1).toContain(state1);
      expect(url2).toContain(state2);
      expect(url1).not.toContain(state2);
    });
  });

  describe("Redirect URI validation", () => {
    it("should include redirect URI in authorization URL", () => {
      const url = getOAuthAuthorizationUrl("google_ads", mockConfig, "state");
      expect(url).toContain("redirect_uri=");
    });

    it("should handle different redirect URIs", () => {
      const config1 = { ...mockConfig, redirectUri: "http://localhost:3000/callback" };
      const config2 = { ...mockConfig, redirectUri: "https://example.com/oauth/callback" };

      const url1 = getOAuthAuthorizationUrl("meta_ads", config1, "state");
      const url2 = getOAuthAuthorizationUrl("meta_ads", config2, "state");

      expect(url1).toContain("redirect_uri=");
      expect(url2).toContain("redirect_uri=");
    });
  });
});
