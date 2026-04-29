import { businessProfiles, integrationCredentials, multiRoleApprovals } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import crypto from "crypto";

// ─── Business Profile Management ──────────────────────────────────────────────

export interface BusinessProfileInput {
  name: string;
  legalName?: string;
  description?: string;
  industry?: string;
  businessActivities?: string[];
  websiteUrl?: string;
  logoUrl?: string;
  annualRevenueTarget?: number;
  monthlyRevenueTarget?: number;
  avgDealSize?: number;
  avgUnitPrice?: number;
  targetMarginPercent?: number;
  currency?: string;
  operationalHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  defaultLanguage?: string;
  aiConfig?: {
    riskTolerance: "low" | "moderate" | "high";
    communicationTone: "professional" | "casual" | "formal";
  };
}

export async function createBusinessProfile(
  tenantId: number,
  ownerUserId: number,
  input: BusinessProfileInput
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const profileId = crypto.randomUUID();
  await db.insert(businessProfiles).values({
    id: profileId,
    tenantId,
    ownerUserId,
    name: input.name,
    legalName: input.legalName,
    description: input.description,
    industry: input.industry,
    businessActivities: input.businessActivities || [],
    websiteUrl: input.websiteUrl,
    logoUrl: input.logoUrl,
    annualRevenueTarget: input.annualRevenueTarget,
    monthlyRevenueTarget: input.monthlyRevenueTarget,
    avgDealSize: input.avgDealSize,
    avgUnitPrice: input.avgUnitPrice,
    targetMarginPercent: input.targetMarginPercent,
    currency: input.currency || "USD",
    operationalHours: input.operationalHours,
    defaultLanguage: input.defaultLanguage || "en",
    aiConfig: input.aiConfig || {
      riskTolerance: "moderate",
      communicationTone: "professional",
    },
  });

  return profileId;
}

export async function getBusinessProfiles(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.tenantId, tenantId));
}

export async function getBusinessProfile(profileId: string, tenantId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(businessProfiles)
    .where(and(eq(businessProfiles.id, profileId), eq(businessProfiles.tenantId, tenantId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateBusinessProfile(
  profileId: string,
  tenantId: number,
  input: Partial<BusinessProfileInput>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(businessProfiles)
    .set(input)
    .where(and(eq(businessProfiles.id, profileId), eq(businessProfiles.tenantId, tenantId)));

  return true;
}

export async function deleteBusinessProfile(profileId: string, tenantId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(businessProfiles)
    .where(and(eq(businessProfiles.id, profileId), eq(businessProfiles.tenantId, tenantId)));

  return true;
}

// ─── Integration Credential Management ────────────────────────────────────────

export interface CredentialInput {
  integrationType: string;
  integrationName: string;
  displayName: string;
  credentialType: "api_key" | "oauth_token" | "basic_auth" | "custom";
  credentials: Record<string, unknown>;
  oauthToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

function encryptCredentials(data: Record<string, unknown>): string {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY || "default-key-32-chars-long-for-aes";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key.padEnd(32, "0").slice(0, 32)), iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptCredentials(encrypted: string): Record<string, unknown> {
  try {
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY || "default-key-32-chars-long-for-aes";
    const [ivHex, encryptedData] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key.padEnd(32, "0").slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Failed to decrypt credentials:", error);
    return {};
  }
}

export async function createIntegrationCredential(
  tenantId: number,
  businessProfileId: string | null,
  input: CredentialInput
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const encryptedCreds = encryptCredentials(input.credentials);
  const credentialId = crypto.randomUUID();

  await db.insert(integrationCredentials).values({
    id: credentialId,
    tenantId,
    businessProfileId,
    integrationType: input.integrationType,
    integrationName: input.integrationName,
    displayName: input.displayName,
    encryptedCredentials: encryptedCreds,
    credentialType: input.credentialType,
    oauthToken: input.oauthToken,
    refreshToken: input.refreshToken,
    tokenExpiresAt: input.tokenExpiresAt,
    isVerified: false,
    verificationStatus: "pending",
  });

  return credentialId;
}

export async function getIntegrationCredentials(tenantId: number, businessProfileId?: string) {
  const db = await getDb();
  if (!db) return [];

  if (businessProfileId) {
    return db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.tenantId, tenantId),
          eq(integrationCredentials.businessProfileId, businessProfileId)
        )
      );
  }

  return db
    .select()
    .from(integrationCredentials)
    .where(eq(integrationCredentials.tenantId, tenantId))
}

export async function verifyIntegrationCredential(
  credentialId: string,
  tenantId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const cred = await db
    .select()
    .from(integrationCredentials)
    .where(and(eq(integrationCredentials.id, credentialId), eq(integrationCredentials.tenantId, tenantId)))
    .limit(1);

  if (cred.length === 0) {
    return { success: false, error: "Credential not found" };
  }

  try {
    const credential = cred[0];
    decryptCredentials(credential.encryptedCredentials);

    // TODO: Implement actual verification logic based on integration type
    await db
      .update(integrationCredentials)
      .set({
        isVerified: true,
        verificationStatus: "verified",
        lastVerifiedAt: new Date(),
      })
      .where(eq(integrationCredentials.id, credentialId));

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(integrationCredentials)
      .set({
        verificationStatus: "failed",
        verificationError: errorMsg,
      })
      .where(eq(integrationCredentials.id, credentialId));

    return { success: false, error: errorMsg };
  }
}

export async function deleteIntegrationCredential(credentialId: string, tenantId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(integrationCredentials)
    .where(and(eq(integrationCredentials.id, credentialId), eq(integrationCredentials.tenantId, tenantId)));

  return true;
}

// ─── Multi-Role Approval Management ───────────────────────────────────────────

export async function createMultiRoleApproval(
  approvalId: string,
  tenantId: number,
  requiredRoles: string[]
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const approvalChain = requiredRoles.map((role) => ({
    role,
    status: "pending" as const,
  }));

  const multiRoleId = crypto.randomUUID();
  await db.insert(multiRoleApprovals).values({
    id: multiRoleId,
    approvalId,
    tenantId,
    requiredRoles,
    approvalChain,
    allApprovalsReceived: false,
  });

  return multiRoleId;
}

export async function approveMultiRoleApproval(
  approvalId: string,
  tenantId: number,
  role: string,
  userId: number
): Promise<{ success: boolean; allApproved: boolean }> {
  const db = await getDb();
  if (!db) return { success: false, allApproved: false };

  const mra = await db
    .select()
    .from(multiRoleApprovals)
    .where(and(eq(multiRoleApprovals.approvalId, approvalId), eq(multiRoleApprovals.tenantId, tenantId)))
    .limit(1);

  if (mra.length === 0) {
    return { success: false, allApproved: false };
  }

  const approval = mra[0];
  const updatedChain = (approval.approvalChain as any[]).map((item) =>
    item.role === role
      ? {
          ...item,
          status: "approved",
          approvedBy: userId,
          approvedAt: Date.now(),
        }
      : item
  );

  const allApproved = updatedChain.every((item) => item.status === "approved");

  await db
    .update(multiRoleApprovals)
    .set({
      approvalChain: updatedChain,
      allApprovalsReceived: allApproved,
    })
    .where(eq(multiRoleApprovals.approvalId, approvalId));

  return { success: true, allApproved };
}
