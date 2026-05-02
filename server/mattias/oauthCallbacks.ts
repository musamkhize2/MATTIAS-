import { z } from "zod";
import { getDb } from "../db";
import { crmConnectors } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * OAuth callback handler for CRM and ad platform integrations
 * Exchanges authorization code for access token and stores credentials
 */

export const OAuthCallbackSchema = z.object({
  code: z.string().describe("Authorization code from OAuth provider"),
  state: z.string().describe("State parameter for CSRF protection"),
  provider: z.enum(["hubspot", "salesforce", "pipedrive", "google_ads", "meta", "tiktok", "youtube"]),
  tenantId: z.string(),
});

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  provider: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const tokenEndpoints: Record<string, string> = {
    hubspot: "https://api.hubapi.com/oauth/v1/token",
    salesforce: "https://login.salesforce.com/services/oauth2/token",
    pipedrive: "https://api.pipedrive.com/v1/oauth/token",
    google_ads: "https://oauth2.googleapis.com/token",
    meta: "https://graph.instagram.com/v18.0/oauth/access_token",
    tiktok: "https://open.tiktokapis.com/v1/oauth/token",
    youtube: "https://oauth2.googleapis.com/token",
  };

  const clientIds: Record<string, string> = {
    hubspot: process.env.HUBSPOT_CLIENT_ID || "",
    salesforce: process.env.SALESFORCE_CLIENT_ID || "",
    pipedrive: process.env.PIPEDRIVE_CLIENT_ID || "",
    google_ads: process.env.GOOGLE_ADS_CLIENT_ID || "",
    meta: process.env.META_CLIENT_ID || "",
    tiktok: process.env.TIKTOK_CLIENT_ID || "",
    youtube: process.env.YOUTUBE_CLIENT_ID || "",
  };

  const clientSecrets: Record<string, string> = {
    hubspot: process.env.HUBSPOT_CLIENT_SECRET || "",
    salesforce: process.env.SALESFORCE_CLIENT_SECRET || "",
    pipedrive: process.env.PIPEDRIVE_CLIENT_SECRET || "",
    google_ads: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
    meta: process.env.META_CLIENT_SECRET || "",
    tiktok: process.env.TIKTOK_CLIENT_SECRET || "",
    youtube: process.env.YOUTUBE_CLIENT_SECRET || "",
  };

  const endpoint = tokenEndpoints[provider];
  const clientId = clientIds[provider];
  const clientSecret = clientSecrets[provider];

  if (!endpoint || !clientId || !clientSecret) {
    throw new Error(`OAuth credentials not configured for ${provider}`);
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${error}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: data.expires_in as number | undefined,
  };
}

/**
 * Handle OAuth callback and store credentials
 */
export async function handleOAuthCallback(
  provider: string,
  code: string,
  state: string,
  tenantId: string,
  redirectUri: string
): Promise<{ success: boolean; connectorId?: string; error?: string }> {
  try {
    // Verify state parameter (in production, validate against stored state)
    if (!state) {
      throw new Error("Invalid state parameter");
    }

    // Exchange code for token
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(provider, code, redirectUri);

    // Store credentials in database
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    const result = await db
      .insert(crmConnectors)
      .values({
        tenantId: parseInt(tenantId),
        crmType: provider,
        displayName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Connection`,
        oauthToken: accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt: expiresAt,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return {
      success: true,
      connectorId: String((result as any)[0]?.id || (result as any).insertId),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Refresh access token for expired credentials
 */
export async function refreshAccessToken(
  provider: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresIn?: number }> {
  const tokenEndpoints: Record<string, string> = {
    hubspot: "https://api.hubapi.com/oauth/v1/token",
    salesforce: "https://login.salesforce.com/services/oauth2/token",
    pipedrive: "https://api.pipedrive.com/v1/oauth/token",
    google_ads: "https://oauth2.googleapis.com/token",
    meta: "https://graph.instagram.com/v18.0/oauth/access_token",
    tiktok: "https://open.tiktokapis.com/v1/oauth/token",
    youtube: "https://oauth2.googleapis.com/token",
  };

  const clientIds: Record<string, string> = {
    hubspot: process.env.HUBSPOT_CLIENT_ID || "",
    salesforce: process.env.SALESFORCE_CLIENT_ID || "",
    pipedrive: process.env.PIPEDRIVE_CLIENT_ID || "",
    google_ads: process.env.GOOGLE_ADS_CLIENT_ID || "",
    meta: process.env.META_CLIENT_ID || "",
    tiktok: process.env.TIKTOK_CLIENT_ID || "",
    youtube: process.env.YOUTUBE_CLIENT_ID || "",
  };

  const clientSecrets: Record<string, string> = {
    hubspot: process.env.HUBSPOT_CLIENT_SECRET || "",
    salesforce: process.env.SALESFORCE_CLIENT_SECRET || "",
    pipedrive: process.env.PIPEDRIVE_CLIENT_SECRET || "",
    google_ads: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
    meta: process.env.META_CLIENT_SECRET || "",
    tiktok: process.env.TIKTOK_CLIENT_SECRET || "",
    youtube: process.env.YOUTUBE_CLIENT_SECRET || "",
  };

  const endpoint = tokenEndpoints[provider];
  const clientId = clientIds[provider];
  const clientSecret = clientSecrets[provider];

  if (!endpoint || !clientId || !clientSecret) {
    throw new Error(`OAuth credentials not configured for ${provider}`);
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    expiresIn: data.expires_in as number | undefined,
  };
}

/**
 * Generate OAuth authorization URL for user to grant permissions
 */
export function generateOAuthUrl(
  provider: string,
  tenantId: string,
  redirectUri: string,
  state: string
): string {
  const authUrls: Record<string, string> = {
    hubspot: "https://app.hubapi.com/oauth/authorize",
    salesforce: "https://login.salesforce.com/services/oauth2/authorize",
    pipedrive: "https://oauth.pipedrive.com/oauth/authorize",
    google_ads: "https://accounts.google.com/o/oauth2/v2/auth",
    meta: "https://www.instagram.com/oauth/authorize",
    tiktok: "https://open.tiktokapis.com/v1/oauth/authorize",
    youtube: "https://accounts.google.com/o/oauth2/v2/auth",
  };

  const scopes: Record<string, string[]> = {
    hubspot: ["crm.objects.contacts.read", "crm.objects.deals.read"],
    salesforce: ["api", "refresh_token"],
    pipedrive: ["deals:read", "contacts:read"],
    google_ads: ["https://www.googleapis.com/auth/adwords"],
    meta: ["instagram_basic", "instagram_graph_user_media"],
    tiktok: ["user.info.basic", "video.list"],
    youtube: ["https://www.googleapis.com/auth/youtube"],
  };

  const clientIds: Record<string, string> = {
    hubspot: process.env.HUBSPOT_CLIENT_ID || "",
    salesforce: process.env.SALESFORCE_CLIENT_ID || "",
    pipedrive: process.env.PIPEDRIVE_CLIENT_ID || "",
    google_ads: process.env.GOOGLE_ADS_CLIENT_ID || "",
    meta: process.env.META_CLIENT_ID || "",
    tiktok: process.env.TIKTOK_CLIENT_ID || "",
    youtube: process.env.YOUTUBE_CLIENT_ID || "",
  };

  const authUrl = authUrls[provider];
  const scope = scopes[provider]?.join(" ") || "";
  const clientId = clientIds[provider];

  if (!authUrl || !clientId) {
    throw new Error(`OAuth not configured for ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });

  return `${authUrl}?${params.toString()}`;
}
