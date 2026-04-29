import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createBusinessProfile,
  getBusinessProfiles,
  getBusinessProfile,
  updateBusinessProfile,
  deleteBusinessProfile,
  createIntegrationCredential,
  getIntegrationCredentials,
  verifyIntegrationCredential,
  deleteIntegrationCredential,
} from "./businessProfileManager";

export const businessProfileRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.tenantId) return [];
    return getBusinessProfiles(ctx.user.tenantId);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        legalName: z.string().optional(),
        description: z.string().optional(),
        industry: z.string().optional(),
        businessActivities: z.array(z.string()).optional(),
        websiteUrl: z.string().optional(),
        logoUrl: z.string().optional(),
        annualRevenueTarget: z.number().optional(),
        monthlyRevenueTarget: z.number().optional(),
        avgDealSize: z.number().optional(),
        avgUnitPrice: z.number().optional(),
        targetMarginPercent: z.number().optional(),
        currency: z.string().optional(),
        operationalHours: z
          .object({
            start: z.string(),
            end: z.string(),
            timezone: z.string(),
          })
          .optional(),
        defaultLanguage: z.string().optional(),
        aiConfig: z
          .object({
            riskTolerance: z.enum(["low", "moderate", "high"]),
            communicationTone: z.enum(["professional", "casual", "formal"]),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id || !ctx.user?.tenantId) throw new Error("Not authenticated");
      return createBusinessProfile(ctx.user.tenantId, ctx.user.id, input);
    }),

  get: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.tenantId) return null;
      return getBusinessProfile(input.profileId, ctx.user.tenantId);
    }),

  update: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        data: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.tenantId) return false;
      return updateBusinessProfile(input.profileId, ctx.user.tenantId, input.data || {});
    }),

  delete: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.tenantId) return false;
      return deleteBusinessProfile(input.profileId, ctx.user.tenantId);
    }),
});

export const integrationCredentialRouter = router({
  list: protectedProcedure
    .input(z.object({ businessProfileId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.tenantId) return [];
      return getIntegrationCredentials(ctx.user.tenantId, input.businessProfileId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        businessProfileId: z.string().optional(),
        integrationType: z.string(),
        integrationName: z.string(),
        displayName: z.string(),
        credentialType: z.enum(["api_key", "oauth_token", "basic_auth", "custom"]),
        credentials: z.record(z.string(), z.unknown()),
        oauthToken: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.tenantId) throw new Error("Not authenticated");
      return createIntegrationCredential(ctx.user.tenantId, input.businessProfileId || null, input);
    }),

  verify: protectedProcedure
    .input(z.object({ credentialId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.tenantId) throw new Error("Not authenticated");
      return verifyIntegrationCredential(input.credentialId, ctx.user.tenantId);
    }),

  delete: protectedProcedure
    .input(z.object({ credentialId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.tenantId) return false;
      return deleteIntegrationCredential(input.credentialId, ctx.user.tenantId);
    }),
});
