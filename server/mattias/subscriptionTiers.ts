import { getDb } from "../db";
import { tenants, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Subscription tier definitions
 * Note: Maps to tenants.subscriptionTier enum
 */
export enum SubscriptionTier {
  PERSONAL = "personal",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
}

export interface TierFeatures {
  name: string;
  description: string;
  price: number;
  billingPeriod: "monthly" | "annual" | "custom";
  features: string[];
  limits: {
    companiesAllowed: number;
    monthlyRequests: number;
    storageGB: number;
    teamMembers: number;
    apiAccess: boolean;
    customIntegrations: boolean;
    dedicatedSupport: boolean;
    sso: boolean;
  };
}

export const TIER_DEFINITIONS: Record<SubscriptionTier, TierFeatures> = {
   [SubscriptionTier.PERSONAL]: {
    name: "Personal",
    description: "Perfect for growing teams - $49/month",
    price: 49,
    billingPeriod: "monthly",
    features: [
      "Up to 50 companies",
      "Advanced company profiles",
      "Full memory system with embeddings",
      "Document ingestion & analysis",
      "Business plan research",
      "Credential management",
      "Integration health monitoring",
      "Priority email support",
      "7 days free trial",
    ],
    limits: {
      companiesAllowed: 50,
      monthlyRequests: 5000,
      storageGB: 10,
      teamMembers: 3,
      apiAccess: true,
      customIntegrations: false,
      dedicatedSupport: false,
      sso: false,
    },
  },
  [SubscriptionTier.PROFESSIONAL]: {
    name: "Professional",
    description: "For established businesses - $139/month",
    price: 139,
    billingPeriod: "monthly",
    features: [
      "Unlimited companies",
      "All Starter features",
      "Advanced analytics & reporting",
      "Custom integrations (up to 5)",
      "Multi-user collaboration",
      "Role-based access control",
      "Webhook support",
      "Phone & email support",
      "7 days free trial",
    ],
    limits: {
      companiesAllowed: 1000,
      monthlyRequests: 50000,
      storageGB: 100,
      teamMembers: 10,
      apiAccess: true,
      customIntegrations: true,
      dedicatedSupport: false,
      sso: false,
    },
  },
  [SubscriptionTier.ENTERPRISE]: {
    name: "Enterprise",
    description: "For large organizations - $389/month",
    price: 389,
    billingPeriod: "monthly",
    features: [
      "Unlimited everything",
      "All Professional features",
      "Dedicated account manager",
      "Custom SLA",
      "Advanced security features",
      "Single Sign-On (SSO)",
      "Custom workflows",
      "Advanced API access",
      "24/7 phone support",
      "7 days free trial",
    ],
    limits: {
      companiesAllowed: 10000,
      monthlyRequests: 500000,
      storageGB: 1000,
      teamMembers: 100,
      apiAccess: true,
      customIntegrations: true,
      dedicatedSupport: true,
      sso: true,
    },
  },

};

/**
 * Get tier features by tier name
 */
export function getTierFeatures(tier: string): TierFeatures | null {
  return TIER_DEFINITIONS[tier as SubscriptionTier] || null;
}

/**
 * Get all available tiers
 */
export function getAllTiers(): Array<{ tier: SubscriptionTier; features: TierFeatures }> {
  return Object.entries(TIER_DEFINITIONS).map(([tier, features]) => ({
    tier: tier as SubscriptionTier,
    features,
  }));
}

/**
 * Get subscription details for tenant
 */
export async function getSubscriptionDetails(tenantId: number) {
  try {
    const db = await getDb();
    if (!db) return null;

    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant || tenant.length === 0) return null;
    const tenantData = tenant[0];

    const tierFeatures = getTierFeatures(tenantData.subscriptionTier);

    return {
      tenantId,
      currentTier: tenantData.subscriptionTier,
      tierDetails: tierFeatures,
      createdAt: tenantData.createdAt,
      updatedAt: tenantData.updatedAt,
    };
  } catch (error) {
    console.error("Error getting subscription details:", error);
    return null;
  }
}

/**
 * Upgrade tenant subscription
 */
export async function upgradeSubscription(tenantId: number, newTier: SubscriptionTier): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db
      .update(tenants)
      .set({
        subscriptionTier: newTier,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    return true;
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return false;
  }
}

/**
 * Check if tenant has access to a feature
 */
export async function hasFeatureAccess(tenantId: number, featureName: string): Promise<boolean> {
  try {
    const subscriptionDetails = await getSubscriptionDetails(tenantId);
    if (!subscriptionDetails || !subscriptionDetails.tierDetails) return false;

    return subscriptionDetails.tierDetails.features.some((f) =>
      f.toLowerCase().includes(featureName.toLowerCase())
    );
  } catch (error) {
    console.error("Error checking feature access:", error);
    return false;
  }
}

/**
 * Check if tenant has exceeded limits
 */
export async function checkLimits(
  tenantId: number,
  limitType: keyof TierFeatures["limits"],
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  try {
    const subscriptionDetails = await getSubscriptionDetails(tenantId);
    if (!subscriptionDetails || !subscriptionDetails.tierDetails) {
      return { allowed: false, limit: 0, current: currentUsage };
    }

    const limitValue = subscriptionDetails.tierDetails.limits[limitType];
    const numLimit = typeof limitValue === "number" ? limitValue : 0;

    return {
      allowed: currentUsage < numLimit,
      limit: numLimit,
      current: currentUsage,
    };
  } catch (error) {
    console.error("Error checking limits:", error);
    return { allowed: false, limit: 0, current: currentUsage };
  }
}

/**
 * Get user's tenant subscription
 */
export async function getUserSubscription(userId: number) {
  try {
    const db = await getDb();
    if (!db) return null;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.length === 0 || !user[0].tenantId) return null;

    return getSubscriptionDetails(user[0].tenantId);
  } catch (error) {
    console.error("Error getting user subscription:", error);
    return null;
  }
}
