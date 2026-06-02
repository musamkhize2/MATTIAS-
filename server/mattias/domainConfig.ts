import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { Tenant } from "../../drizzle/schema";

export interface DomainConfig {
  tenantId: number;
  customDomain?: string;
  webhookBaseUrl: string;
  notificationEmail?: string;
  slackWebhookUrl?: string;
}

/**
 * Get domain configuration for a tenant
 */
export async function getDomainConfig(tenantId: number): Promise<DomainConfig> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const tenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant || tenant.length === 0) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  const t = tenant[0];
  const features = (t.features as any) || {};

  // Build webhook base URL
  const customDomain = features.customDomain;
  const webhookBaseUrl = customDomain
    ? `https://${customDomain}`
    : `https://${process.env.VITE_APP_ID || "mattias"}.manus.space`;

  return {
    tenantId,
    customDomain,
    webhookBaseUrl,
    notificationEmail: features.notificationEmail,
    slackWebhookUrl: features.slackWebhookUrl,
  };
}

/**
 * Update domain configuration for a tenant
 */
export async function updateDomainConfig(
  tenantId: number,
  config: Partial<DomainConfig>
): Promise<DomainConfig> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const tenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant || tenant.length === 0) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  const t = tenant[0];
  const features = (t.features as any) || {};

  // Update features with new config
  if (config.customDomain) {
    features.customDomain = config.customDomain;
  }
  if (config.notificationEmail) {
    features.notificationEmail = config.notificationEmail;
  }
  if (config.slackWebhookUrl) {
    features.slackWebhookUrl = config.slackWebhookUrl;
  }

  await db
    .update(tenants)
    .set({
      features: features,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));

  return getDomainConfig(tenantId);
}

/**
 * Validate custom domain format
 */
export function validateDomain(domain: string): boolean {
  const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Generate webhook URL for a campaign
 */
export async function generateWebhookUrl(
  tenantId: number,
  campaignId: string,
  eventType: string
): Promise<string> {
  const config = await getDomainConfig(tenantId);
  return `${config.webhookBaseUrl}/api/webhooks/campaigns/${campaignId}/${eventType}`;
}

/**
 * Generate MailerLite webhook URL
 */
export async function generateMailerLiteWebhookUrl(
  tenantId: number
): Promise<string> {
  const config = await getDomainConfig(tenantId);
  return `${config.webhookBaseUrl}/api/webhooks/mailerlite`;
}
