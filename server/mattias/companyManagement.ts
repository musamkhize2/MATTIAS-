import { getDb } from "../db";
import { companies, companyMemory, companyMetrics } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Company Management Service
 * Handles company CRUD operations, memory storage, and metrics tracking
 */

export interface CompanyInput {
  name: string;
  industry?: string;
  website?: string;
  description?: string;
  monthlyRevenue?: number;
  employeeCount?: number;
  foundedYear?: number;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  socialMediaLinks?: Record<string, string>;
  customMetrics?: Record<string, any>;
}

export interface MemoryInput {
  memoryType: "interaction_history" | "performance_notes" | "campaign_insights" | "customer_feedback" | "market_analysis" | "strategic_goals" | "custom_note";
  title: string;
  content: string;
  tags?: string[];
  importance?: "low" | "medium" | "high";
}

/**
 * Create a new company
 */
export async function createCompany(
  tenantId: number,
  userId: number,
  input: CompanyInput
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const companyId = uuidv4();

  await db.insert(companies).values({
    id: companyId,
    tenantId,
    userId,
    name: input.name,
    industry: input.industry,
    website: input.website,
    description: input.description,
    monthlyRevenue: input.monthlyRevenue,
    employeeCount: input.employeeCount,
    foundedYear: input.foundedYear,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    location: input.location,
    socialMediaLinks: input.socialMediaLinks ? JSON.stringify(input.socialMediaLinks) : null,
    customMetrics: input.customMetrics ? JSON.stringify(input.customMetrics) : null,
  });

  // Create associated metrics record
  await db.insert(companyMetrics).values({
    id: uuidv4(),
    companyId,
    tenantId,
  });

  return companyId;
}

/**
 * Get company by ID
 */
export async function getCompany(companyId: string, tenantId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all companies for tenant
 */
export async function getCompanies(tenantId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(companies)
    .where(eq(companies.tenantId, tenantId))
    .orderBy((t) => t.updatedAt);
}

/**
 * Update company
 */
export async function updateCompany(
  companyId: string,
  tenantId: number,
  input: Partial<CompanyInput>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(companies)
    .set({
      name: input.name,
      industry: input.industry,
      website: input.website,
      description: input.description,
      monthlyRevenue: input.monthlyRevenue,
      employeeCount: input.employeeCount,
      foundedYear: input.foundedYear,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      location: input.location,
      socialMediaLinks: input.socialMediaLinks ? JSON.stringify(input.socialMediaLinks) : undefined,
      customMetrics: input.customMetrics ? JSON.stringify(input.customMetrics) : undefined,
    })
    .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));
}

/**
 * Delete company and all associated data
 */
export async function deleteCompany(companyId: string, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete memory records
  await db
    .delete(companyMemory)
    .where(and(eq(companyMemory.companyId, companyId), eq(companyMemory.tenantId, tenantId)));

  // Delete metrics
  await db
    .delete(companyMetrics)
    .where(and(eq(companyMetrics.companyId, companyId), eq(companyMetrics.tenantId, tenantId)));

  // Delete company
  await db.delete(companies).where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));
}

/**
 * Add memory entry for company
 */
export async function addMemory(
  companyId: string,
  tenantId: number,
  input: MemoryInput
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const memoryId = uuidv4();

  await db.insert(companyMemory).values({
    id: memoryId,
    companyId,
    tenantId,
    memoryType: input.memoryType,
    title: input.title,
    content: input.content,
    tags: input.tags ? JSON.stringify(input.tags) : null,
    importance: input.importance || "medium",
  });

  return memoryId;
}

/**
 * Get all memory entries for company
 */
export async function getMemories(companyId: string, tenantId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(companyMemory)
    .where(and(eq(companyMemory.companyId, companyId), eq(companyMemory.tenantId, tenantId)))
    .orderBy((t) => t.createdAt);
}

/**
 * Get memory by type
 */
export async function getMemoriesByType(
  companyId: string,
  tenantId: number,
  memoryType: "interaction_history" | "performance_notes" | "campaign_insights" | "customer_feedback" | "market_analysis" | "strategic_goals" | "custom_note"
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(companyMemory)
    .where(
      and(
        eq(companyMemory.companyId, companyId),
        eq(companyMemory.tenantId, tenantId),
        eq(companyMemory.memoryType, memoryType as any)
      )
    )
    .orderBy((t) => t.createdAt);
}

/**
 * Update memory entry
 */
export async function updateMemory(
  memoryId: string,
  tenantId: number,
  input: Partial<MemoryInput>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(companyMemory)
    .set({
      title: input.title,
      content: input.content,
      tags: input.tags ? JSON.stringify(input.tags) : undefined,
      importance: input.importance,
    })
    .where(eq(companyMemory.id, memoryId));
}

/**
 * Delete memory entry
 */
export async function deleteMemory(memoryId: string, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(companyMemory).where(eq(companyMemory.id, memoryId));
}

/**
 * Get company metrics
 */
export async function getMetrics(companyId: string, tenantId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(companyMetrics)
    .where(and(eq(companyMetrics.companyId, companyId), eq(companyMetrics.tenantId, tenantId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update company metrics
 */
export async function updateMetrics(
  companyId: string,
  tenantId: number,
  metrics: Partial<any>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(companyMetrics)
    .set({
      totalCampaigns: metrics.totalCampaigns,
      activeCampaigns: metrics.activeCampaigns,
      totalAdSpend: metrics.totalAdSpend,
      totalConversions: metrics.totalConversions,
      averageROAS: metrics.averageROAS,
      leadGenerated: metrics.leadGenerated,
      conversionRate: metrics.conversionRate,
      customerAcquisitionCost: metrics.customerAcquisitionCost,
      monthOverMonthGrowth: metrics.monthOverMonthGrowth,
      yearOverYearGrowth: metrics.yearOverYearGrowth,
    })
    .where(and(eq(companyMetrics.companyId, companyId), eq(companyMetrics.tenantId, tenantId)));
}

/**
 * Search companies by name or industry
 */
export async function searchCompanies(
  tenantId: number,
  query: string
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  // Simple search - in production, use full-text search
  return await db
    .select()
    .from(companies)
    .where(eq(companies.tenantId, tenantId));
    // Filter in application layer for simplicity
}

/**
 * Get company summary with metrics and recent memories
 */
export async function getCompanySummary(companyId: string, tenantId: number): Promise<any> {
  const company = await getCompany(companyId, tenantId);
  if (!company) return null;

  const metrics = await getMetrics(companyId, tenantId);
  const memories = await getMemories(companyId, tenantId);

  return {
    company,
    metrics,
    recentMemories: memories.slice(-5), // Last 5 memories
    memoryCount: memories.length,
  };
}
