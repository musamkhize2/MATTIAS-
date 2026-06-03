import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  addMemory,
  getMemories,
  getMemoriesByType,
  updateMemory,
  deleteMemory,
  getMetrics,
  updateMetrics,
  searchCompanies,
} from "./companyManagement";
import { getOrCreateDefaultTenant } from "../db";

// ─── Company Router ────────────────────────────────────────────────────────────

export const companyRouter = router({
  // List all companies for the current user/tenant
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const companies = await getCompanies(tenant.id);
    return companies;
  }),

  // Get a specific company by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const company = await getCompany(input.id, tenant.id);
      return company;
    }),

  // Create a new company
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Company name is required"),
        industry: z.string().optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        monthlyRevenue: z.number().positive().optional(),
        employeeCount: z.number().positive().optional(),
        foundedYear: z.number().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        location: z.string().optional(),
        socialMediaLinks: z.record(z.string(), z.any()).optional(),
        customMetrics: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('[Company.create] Starting company creation for user:', ctx.user.id);
        const tenant = await getOrCreateDefaultTenant(ctx.user.id);
        console.log('[Company.create] Tenant:', tenant.id);
        const companyId = await createCompany(tenant.id, ctx.user.id, input as any);
        console.log('[Company.create] Company created:', companyId);
        const company = await getCompany(companyId, tenant.id);
        console.log('[Company.create] Company retrieved:', company);
        return company;
      } catch (error) {
        console.error('[Company.create] Error:', error instanceof Error ? error.message : String(error));
        console.error('[Company.create] Full error:', error);
        throw error;
      }
    }),

  // Update an existing company
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        industry: z.string().optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        monthlyRevenue: z.number().positive().optional(),
        employeeCount: z.number().positive().optional(),
        foundedYear: z.number().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        location: z.string().optional(),
        socialMediaLinks: z.record(z.string(), z.any()).optional(),
        customMetrics: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const { id, ...data } = input;
      await updateCompany(id, tenant.id, data as any);
      const company = await getCompany(id, tenant.id);
      return company;
    }),

  // Delete a company
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      await deleteCompany(input.id, tenant.id);
      return { success: true };
    }),

  // ─── Memory Operations ─────────────────────────────────────────────────────

  // Add a memory to a company
  addMemory: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        memoryType: z.enum([
          "interaction_history",
          "performance_notes",
          "campaign_insights",
          "customer_feedback",
          "market_analysis",
          "strategic_goals",
          "custom_note",
        ]),
        title: z.string(),
        content: z.string(),
        importance: z.enum(["low", "medium", "high"]).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const memoryId = await addMemory(input.companyId, tenant.id, {
        memoryType: input.memoryType,
        title: input.title,
        content: input.content,
        importance: input.importance || "medium",
        tags: input.tags || [],
      });
      return { id: memoryId };
    }),

  // Get memories for a company
  getMemories: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const memories = await getMemories(input.companyId, tenant.id);
      return memories;
    }),

  // Get memories by type
  getMemoriesByType: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        memoryType: z.enum([
          "interaction_history",
          "performance_notes",
          "campaign_insights",
          "customer_feedback",
          "market_analysis",
          "strategic_goals",
          "custom_note",
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const memories = await getMemoriesByType(
        input.companyId,
        tenant.id,
        input.memoryType
      );
      return memories;
    }),

  // Update a memory
  updateMemory: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        importance: z.enum(["low", "medium", "high"]).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const { id, ...data } = input;
      await updateMemory(id, tenant.id, data);
      return { success: true };
    }),

  // Delete a memory
  deleteMemory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      await deleteMemory(input.id, tenant.id);
      return { success: true };
    }),

  // ─── Metrics Operations ────────────────────────────────────────────────────

  // Get metrics for a company
  getMetrics: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const metrics = await getMetrics(input.companyId, tenant.id);
      return metrics;
    }),

  // Update metrics for a company
  updateMetrics: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        totalCampaigns: z.number().optional(),
        activeCampaigns: z.number().optional(),
        totalAdSpend: z.number().optional(),
        totalConversions: z.number().optional(),
        averageROAS: z.number().optional(),
        leadGenerated: z.number().optional(),
        conversionRate: z.number().optional(),
        customerAcquisitionCost: z.number().optional(),
        monthOverMonthGrowth: z.number().optional(),
        yearOverYearGrowth: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const { companyId, ...metrics } = input;
      await updateMetrics(companyId, tenant.id, metrics);
      const updated = await getMetrics(companyId, tenant.id);
      return updated;
    }),

  // ─── Search ────────────────────────────────────────────────────────────────

  // Search companies
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const companies = await searchCompanies(tenant.id, input.query);
      return companies;
    }),
});

export type CompanyRouter = typeof companyRouter;
