import { getDb } from "../db";
import { integrationCredentials } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Ad Platform OAuth Service
 * Handles OAuth flows for Google Ads, Meta, TikTok, YouTube
 */

export type AdPlatform = "google_ads" | "meta_ads" | "tiktok_ads" | "youtube";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface AdPlatformConfig {
  platform: AdPlatform;
  config: OAuthConfig;
}

/**
 * Get OAuth authorization URL for ad platform
 */
export function getOAuthAuthorizationUrl(
  platform: AdPlatform,
  config: OAuthConfig,
  state: string
): string {
  const baseUrls: Record<AdPlatform, string> = {
    google_ads: "https://accounts.google.com/o/oauth2/v2/auth",
    meta_ads: "https://www.facebook.com/v18.0/dialog/oauth",
    tiktok_ads: "https://business-api.tiktok.com/marketing_api/v3/oauth2/authorize",
    youtube: "https://accounts.google.com/o/oauth2/v2/auth",
  };

  const scopeMap: Record<AdPlatform, string[]> = {
    google_ads: [
      "https://www.googleapis.com/auth/adwords",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    meta_ads: ["ads_management", "business_management"],
    tiktok_ads: ["business_management.account", "business_management.page"],
    youtube: [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
  };

  const baseUrl = baseUrls[platform];
  const scopes = scopeMap[platform] || config.scopes;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  platform: AdPlatform,
  code: string,
  config: OAuthConfig
): Promise<OAuthToken> {
  const tokenUrls: Record<AdPlatform, string> = {
    google_ads: "https://oauth2.googleapis.com/token",
    meta_ads: "https://graph.instagram.com/v18.0/oauth/access_token",
    tiktok_ads: "https://business-api.tiktok.com/marketing_api/v3/oauth2/token",
    youtube: "https://oauth2.googleapis.com/token",
  };

  const tokenUrl = tokenUrls[platform];

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  platform: AdPlatform,
  refreshToken: string,
  config: OAuthConfig
): Promise<OAuthToken> {
  const tokenUrls: Record<AdPlatform, string> = {
    google_ads: "https://oauth2.googleapis.com/token",
    meta_ads: "https://graph.instagram.com/v18.0/oauth/access_token",
    tiktok_ads: "https://business-api.tiktok.com/marketing_api/v3/oauth2/token",
    youtube: "https://oauth2.googleapis.com/token",
  };

  const tokenUrl = tokenUrls[platform];

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 3600,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
  };
}

/**
 * Store ad platform credential
 */
export async function storeAdPlatformCredential(
  tenantId: number,
  platform: AdPlatform,
  token: OAuthToken,
  accountInfo: Record<string, any>
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const credentialId = uuidv4();
  const expiresAt = new Date(Date.now() + token.expiresIn * 1000);

  await db.insert(integrationCredentials).values({
    id: credentialId,
    tenantId,
    integrationType: "ad_platform",
    integrationName: platform,
    displayName: `${platform} Account`,
    credentialType: "oauth_token",
    encryptedCredentials: JSON.stringify({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      scope: token.scope,
      accountInfo,
    }),
    oauthToken: token.accessToken,
    refreshToken: token.refreshToken,
    tokenExpiresAt: expiresAt,
    isActive: true,
    lastVerifiedAt: new Date(),
  });

  return credentialId;
}

/**
 * Get stored ad platform credential
 */
export async function getAdPlatformCredential(
  tenantId: number,
  platform: AdPlatform
): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const credentials = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.tenantId, tenantId),
        eq(integrationCredentials.integrationName, platform),
        eq(integrationCredentials.credentialType, "oauth_token")
      )
    )
    .limit(1);

  return credentials.length > 0 ? credentials[0] : null;
}

/**
 * Validate ad platform credential
 */
export async function validateAdPlatformCredential(
  platform: AdPlatform,
  token: OAuthToken
): Promise<boolean> {
  try {
    const validationUrls: Record<AdPlatform, string> = {
      google_ads: "https://www.googleapis.com/oauth2/v1/userinfo",
      meta_ads: "https://graph.instagram.com/v18.0/me",
      tiktok_ads: "https://business-api.tiktok.com/marketing_api/v3/user/info",
      youtube: "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    };

    const validationUrl = validationUrls[platform];

    const response = await fetch(validationUrl, {
      headers: {
        Authorization: `${token.tokenType} ${token.accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error(`Validation failed for ${platform}:`, error);
    return false;
  }
}

/**
 * Get ad account info from platform
 */
export async function getAdAccountInfo(
  platform: AdPlatform,
  token: OAuthToken
): Promise<Record<string, any>> {
  const infoUrls: Record<AdPlatform, string> = {
    google_ads: "https://www.googleapis.com/oauth2/v1/userinfo",
    meta_ads: "https://graph.instagram.com/v18.0/me?fields=id,name,email",
    tiktok_ads: "https://business-api.tiktok.com/marketing_api/v3/user/info",
    youtube: "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
  };

  const infoUrl = infoUrls[platform];

  try {
    const response = await fetch(infoUrl, {
      headers: {
        Authorization: `${token.tokenType} ${token.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account info: ${response.statusText}`);
    }

    const data = await response.json();

    // Normalize response based on platform
    switch (platform) {
      case "google_ads":
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture,
        };
      case "meta_ads":
        return {
          id: data.id,
          name: data.name,
          email: data.email,
        };
      case "tiktok_ads":
        return {
          id: data.data?.user_id,
          displayName: data.data?.display_name,
          email: data.data?.email,
        };
      case "youtube":
        return {
          id: data.items?.[0]?.id,
          title: data.items?.[0]?.snippet?.title,
          description: data.items?.[0]?.snippet?.description,
          thumbnail: data.items?.[0]?.snippet?.thumbnails?.default?.url,
        };
      default:
        return data;
    }
  } catch (error) {
    console.error(`Failed to get account info for ${platform}:`, error);
    throw error;
  }
}

/**
 * Revoke ad platform credential
 */
export async function revokeAdPlatformCredential(
  platform: AdPlatform,
  token: OAuthToken
): Promise<boolean> {
  try {
    const revokeUrls: Record<AdPlatform, string> = {
      google_ads: "https://oauth2.googleapis.com/revoke",
      meta_ads: "https://graph.instagram.com/v18.0/me/permissions",
      tiktok_ads: "https://business-api.tiktok.com/marketing_api/v3/oauth2/revoke",
      youtube: "https://oauth2.googleapis.com/revoke",
    };

    const revokeUrl = revokeUrls[platform];

    const response = await fetch(revokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: token.accessToken,
      }).toString(),
    });

    return response.ok;
  } catch (error) {
    console.error(`Revocation failed for ${platform}:`, error);
    return false;
  }
}
