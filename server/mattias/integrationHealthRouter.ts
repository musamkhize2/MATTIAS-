import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getOrCreateDefaultTenant } from "../db";
import { integrationStatus } from "../../drizzle/schema";

/**
 * Integration Health Monitoring Router
 * Tracks CRM connector health, API availability, and webhook delivery success
 */

export const integrationHealthRouter = router({
  /**
   * Get current integration health status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = getDb();

    try {
      const statuses = await db
        .select()
        .from(integrationStatus)
        .where((t: any) => t.tenantId === tenant.id);

      const healthSummary = {
        totalIntegrations: statuses.length,
        healthy: statuses.filter((s: any) => s.status === "healthy").length,
        warning: statuses.filter((s: any) => s.status === "warning").length,
        error: statuses.filter((s: any) => s.status === "error").length,
        integrations: statuses,
      };

      return {
        success: true,
        ...healthSummary,
      };
    } catch (error) {
      console.warn("[Integration Health] Status check failed:", error);
      return {
        success: false,
        totalIntegrations: 0,
        healthy: 0,
        warning: 0,
        error: 0,
        integrations: [],
      };
    }
  }),

  /**
   * Update integration health status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        integrationName: z.string(),
        status: z.enum(["healthy", "warning", "error"]),
        lastChecked: z.date().optional(),
        errorMessage: z.string().optional(),
        successRate: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = getDb();

      try {
        // Check if integration status already exists
        const existing = await db
          .select()
          .from(integrationStatus)
          .where(
            (t: any) =>
              t.tenantId === tenant.id &&
              t.integrationName === input.integrationName
          );

        if (existing.length > 0) {
          // Update existing
          await db
            .update(integrationStatus)
            .set({
              status: input.status,
              lastChecked: input.lastChecked?.toISOString() || new Date().toISOString(),
              errorMessage: input.errorMessage,
              successRate: input.successRate,
              updatedAt: new Date().toISOString(),
            })
            .where(
              (t: any) =>
                t.tenantId === tenant.id &&
                t.integrationName === input.integrationName
            );
        } else {
          // Create new
          await db.insert(integrationStatus).values({
            id: `health-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tenantId: tenant.id,
            integrationName: input.integrationName,
            status: input.status,
            lastChecked: input.lastChecked?.toISOString() || new Date().toISOString(),
            errorMessage: input.errorMessage,
            successRate: input.successRate || 100,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[Integration Health] Update failed:", error);
        return { success: false };
      }
    }),

  /**
   * Get webhook delivery metrics
   */
  getWebhookMetrics: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = getDb();

    try {
      // Get webhook events from the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const webhookEvents = await db
        .select()
        .from(require("../../drizzle/schema").webhookEvents)
        .where(
          (t: any) =>
            t.tenantId === tenant.id && t.createdAt >= oneDayAgo
        );

      const totalEvents = webhookEvents.length;
      const successfulEvents = webhookEvents.filter(
        (e: any) => e.status === "success"
      ).length;
      const failedEvents = webhookEvents.filter(
        (e: any) => e.status === "failed"
      ).length;
      const successRate =
        totalEvents > 0 ? ((successfulEvents / totalEvents) * 100).toFixed(2) : 0;

      return {
        success: true,
        totalEvents,
        successfulEvents,
        failedEvents,
        successRate: parseFloat(successRate as string),
        period: "24h",
      };
    } catch (error) {
      console.warn("[Integration Health] Webhook metrics failed:", error);
      return {
        success: false,
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        successRate: 0,
        period: "24h",
      };
    }
  }),

  /**
   * Get API availability status
   */
  getApiStatus: protectedProcedure
    .input(z.object({ apiName: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = getDb();

      try {
        const status = await db
          .select()
          .from(integrationStatus)
          .where(
            (t: any) =>
              t.tenantId === tenant.id &&
              t.integrationName === input.apiName
          );

        if (status.length === 0) {
          return {
            success: false,
            message: "API status not found",
          };
        }

        return {
          success: true,
          apiName: input.apiName,
          status: status[0].status,
          lastChecked: status[0].lastChecked,
          errorMessage: status[0].errorMessage,
          successRate: status[0].successRate,
        };
      } catch (error) {
        console.error("[Integration Health] API status check failed:", error);
        return {
          success: false,
          message: "Failed to check API status",
        };
      }
    }),

  /**
   * Perform health check on all integrations
   */
  runHealthCheck: protectedProcedure.mutation(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = getDb();

    try {
      const integrations = await db
        .select()
        .from(integrationStatus)
        .where((t: any) => t.tenantId === tenant.id);

      const results = [];

      for (const integration of integrations) {
        // Simulate health check - in production, would call actual APIs
        const isHealthy = Math.random() > 0.1; // 90% success rate
        const status = isHealthy ? "healthy" : "error";

        await db
          .update(integrationStatus)
          .set({
            status,
            lastChecked: new Date().toISOString(),
            successRate: isHealthy ? 100 : 0,
            updatedAt: new Date().toISOString(),
          })
          .where((t: any) => t.id === integration.id);

        results.push({
          integrationName: integration.integrationName,
          status,
          checked: new Date().toISOString(),
        });
      }

      return {
        success: true,
        checksPerformed: results.length,
        results,
      };
    } catch (error) {
      console.error("[Integration Health] Health check failed:", error);
      return {
        success: false,
        checksPerformed: 0,
        results: [],
      };
    }
  }),
});
