import { getDb } from "../db";
import { credentialRotationHistory, credentialAuditTrail, integrationCredentials } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Credential Rotation Service
 * Handles credential rotation, expiry checks, and audit logging
 */

export interface RotationRequest {
  credentialId: string;
  tenantId: number;
  rotationType: "manual" | "automatic" | "emergency";
  rotatedBy?: number;
}

export interface AuditLogEntry {
  credentialId: string;
  tenantId: number;
  action: "created" | "verified" | "used" | "rotated" | "refreshed" | "disabled" | "enabled" | "deleted" | "failed_verification";
  actionDetails?: Record<string, any>;
  performedBy?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log credential action to audit trail
 */
export async function logCredentialAction(entry: AuditLogEntry): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const auditId = uuidv4();

  await db.insert(credentialAuditTrail).values({
    id: auditId,
    credentialId: entry.credentialId,
    tenantId: entry.tenantId,
    action: entry.action,
    actionDetails: entry.actionDetails,
    performedBy: entry.performedBy,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  });

  return auditId;
}

/**
 * Initiate credential rotation
 */
export async function rotateCredential(request: RotationRequest): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current credential
  const credential = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.id, request.credentialId),
        eq(integrationCredentials.tenantId, request.tenantId)
      )
    )
    .limit(1);

  if (!credential.length) {
    throw new Error("Credential not found");
  }

  const rotationId = uuidv4();

  // Create rotation history entry
  await db.insert(credentialRotationHistory).values({
    id: rotationId,
    credentialId: request.credentialId,
    tenantId: request.tenantId,
    rotationType: request.rotationType,
    oldTokenHash: hashToken(credential[0].encryptedCredentials),
    rotationStatus: "pending",
    rotatedBy: request.rotatedBy,
  });

  // Log audit trail
  await logCredentialAction({
    credentialId: request.credentialId,
    tenantId: request.tenantId,
    action: "rotated",
    actionDetails: {
      rotationType: request.rotationType,
      rotationId,
    },
    performedBy: request.rotatedBy,
  });

  return rotationId;
}

/**
 * Complete credential rotation
 */
export async function completeRotation(
  rotationId: string,
  newTokenHash: string,
  tenantId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update rotation history
  await db
    .update(credentialRotationHistory)
    .set({
      rotationStatus: "completed",
      newTokenHash,
      rotatedAt: new Date(),
    })
    .where(
      and(
        eq(credentialRotationHistory.id, rotationId),
        eq(credentialRotationHistory.tenantId, tenantId)
      )
    );
}

/**
 * Mark rotation as failed
 */
export async function failRotation(
  rotationId: string,
  error: string,
  tenantId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(credentialRotationHistory)
    .set({
      rotationStatus: "failed",
      rotationError: error,
    })
    .where(
      and(
        eq(credentialRotationHistory.id, rotationId),
        eq(credentialRotationHistory.tenantId, tenantId)
      )
    );
}

/**
 * Get credentials expiring soon
 */
export async function getExpiringCredentials(
  tenantId: number,
  daysUntilExpiry: number = 7
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

  const expiring = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.tenantId, tenantId),
        eq(integrationCredentials.isActive, true)
      )
    );

  return expiring.filter((cred) => {
    if (!cred.tokenExpiresAt) return false;
    return cred.tokenExpiresAt < expiryThreshold;
  });
}

/**
 * Get rotation history for credential
 */
export async function getRotationHistory(
  credentialId: string,
  tenantId: number,
  limit: number = 10
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(credentialRotationHistory)
    .where(
      and(
        eq(credentialRotationHistory.credentialId, credentialId),
        eq(credentialRotationHistory.tenantId, tenantId)
      )
    )
    .orderBy((t) => t.createdAt)
    .limit(limit);
}

/**
 * Get audit trail for credential
 */
export async function getAuditTrail(
  credentialId: string,
  tenantId: number,
  limit: number = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(credentialAuditTrail)
    .where(
      and(
        eq(credentialAuditTrail.credentialId, credentialId),
        eq(credentialAuditTrail.tenantId, tenantId)
      )
    )
    .orderBy((t) => t.createdAt)
    .limit(limit);
}

/**
 * Hash token for audit trail (never store actual token)
 */
function hashToken(token: string): string {
  // In production, use proper hashing (bcrypt, argon2, etc.)
  // This is a simple example
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(token).digest("hex").substring(0, 16);
}

/**
 * Check if credential needs refresh based on token expiry
 */
export async function shouldRefreshToken(credential: any): Promise<boolean> {
  if (!credential.tokenExpiresAt) return false;

  const now = new Date();
  const expiryTime = new Date(credential.tokenExpiresAt);

  // Refresh if token expires within 24 hours
  const hoursUntilExpiry = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilExpiry < 24;
}
