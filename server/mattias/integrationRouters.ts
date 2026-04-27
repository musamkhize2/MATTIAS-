import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createDataSource,
  getDataSources,
  deleteDataSource,
  toggleDataSource,
  createCRMConnector,
  getCRMConnectors,
  deleteCRMConnector,
  toggleCRMConnector,
  processWebhookEvent,
  processCRMEvent,
} from "./dataSourceManager";

async function getTenantId(userId: number) {
  const { getOrCreateDefaultTenant } = await import("../db");
  const tenant = await getOrCreateDefaultTenant(userId);
  return tenant.id;
}

export const dataSourcesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantId(ctx.user.id);
    return getDataSources(tenantId);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.enum(["webhook", "crm", "api"]),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      return createDataSource(tenantId, input.name, input.type, input.config || {});
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      await deleteDataSource(input.id, tenantId);
      return { success: true };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      await toggleDataSource(input.id, tenantId, input.isActive);
      return { success: true };
    }),
});

export const crmConnectorsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantId(ctx.user.id);
    return getCRMConnectors(tenantId);
  }),

  create: protectedProcedure
    .input(
      z.object({
        crmType: z.enum(["hubspot", "salesforce", "pipedrive"]),
        displayName: z.string(),
        oauthToken: z.string(),
        config: z.record(z.string(), z.unknown()).optional(),
        eventMappings: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      const id = await createCRMConnector(
        tenantId,
        input.crmType,
        input.displayName,
        input.oauthToken,
        input.config,
        input.eventMappings
      );
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      await deleteCRMConnector(input.id, tenantId);
      return { success: true };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      await toggleCRMConnector(input.id, tenantId, input.isActive);
      return { success: true };
    }),
});

export const webhooksRouter = router({
  processWebhook: protectedProcedure
    .input(
      z.object({
        sourceId: z.number(),
        type: z.string(),
        data: z.record(z.string(), z.unknown()),
        timestamp: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      const success = await processWebhookEvent(input.sourceId, tenantId, {
        type: input.type,
        data: input.data,
        timestamp: input.timestamp,
      });
      return { success };
    }),

  processCRMEvent: protectedProcedure
    .input(
      z.object({
        connectorId: z.number(),
        crmEventType: z.string(),
        crmData: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      const success = await processCRMEvent(
        input.connectorId,
        tenantId,
        input.crmEventType,
        input.crmData
      );
      return { success };
    }),
});
