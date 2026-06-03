import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getOrCreateDefaultTenant } from "../db";
import { integrationStatus } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
    const db = await getDb();

    if (!db) {
      return {
        success: false,
        totalIntegrations: 0,
        healthy: 0,
        warning: 0,
        error: 0,
        integrations: [],
      };
    }

    try {
      const statuses = await db
        .select()
        .from(integrationStatus)
        .where(eq(integrationStatus.tenantId, tenant.id));

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
   * Update integration status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        integrationName: z.string(),
        status: z.enum(["healthy", "warning", "error"]),
        lastCheckAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        throw new Error("Database connection failed");
      }

      try {
        // Find existing status or create new
        const existing = await db
          .select()
          .from(integrationStatus)
          .where(eq(integrationStatus.tenantId, tenant.id));

        const found = existing.find((s: any) => s.integrationName === input.integrationName);

        if (found) {
          await db
            .update(integrationStatus)
            .set({
              status: input.status,
              lastCheckAt: input.lastCheckAt || new Date().toISOString(),
            })
            .where(eq(integrationStatus.id, found.id));
        } else {
          await db.insert(integrationStatus).values({
            tenantId: tenant.id,
            integrationName: input.integrationName,
            status: input.status,
            lastCheckAt: input.lastCheckAt || new Date().toISOString(),
            webhookDeliverySuccess: 0,
            apiAvailability: 100,
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[Integration Health] Update failed:", error);
        throw new Error("Failed to update integration status");
      }
    }),

  /**
   * Get webhook metrics for last 24 hours
   */
  getWebhookMetrics: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = await getDb();

    if (!db) {
      return {
        success: false,
        metrics: {
          totalWebhooks: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          successRate: 0,
        },
      };
    }

    try {
      const statuses = await db
        .select()
        .from(integrationStatus)
        .where(eq(integrationStatus.tenantId, tenant.id));

      const totalWebhooks = statuses.reduce((sum: number, s: any) => sum + (s.webhookDeliverySuccess || 0), 0);
      const successRate = statuses.length > 0
        ? statuses.reduce((sum: number, s: any) => sum + (s.webhookDeliverySuccess || 0), 0) / statuses.length
        : 0;

      return {
        success: true,
        metrics: {
          totalWebhooks,
          successfulDeliveries: Math.floor(totalWebhooks * (successRate / 100)),
          failedDeliveries: Math.floor(totalWebhooks * (1 - successRate / 100)),
          successRate: Math.round(successRate),
        },
      };
    } catch (error) {
      console.warn("[Integration Health] Webhook metrics failed:", error);
      return {
        success: false,
        metrics: {
          totalWebhooks: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          successRate: 0,
        },
      };
    }
  }),

  /**
   * Get API availability status
   */
  getApiStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = await getDb();

    if (!db) {
      return {
        success: false,
        apis: [],
      };
    }

    try {
      const statuses = await db
        .select()
        .from(integrationStatus)
        .where(eq(integrationStatus.tenantId, tenant.id));

      const apis = statuses.map((s: any) => ({
        name: s.integrationName,
        availability: s.apiAvailability || 100,
        lastCheck: s.lastCheckAt,
      }));

      return {
        success: true,
        apis,
      };
    } catch (error) {
      console.warn("[Integration Health] API status failed:", error);
      return {
        success: false,
        apis: [],
      };
    }
  }),

  /**
   * Run health check on all integrations
   */
  runHealthCheck: protectedProcedure.mutation(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = await getDb();

    if (!db) {
      throw new Error("Database connection failed");
    }

    try {
      const statuses = await db
        .select()
        .from(integrationStatus)
        .where(eq(integrationStatus.tenantId, tenant.id));

      // Simulate health checks
      const results = await Promise.all(
        statuses.map(async (status: any) => {
          try {
            // Placeholder: In production, this would check actual API endpoints
            const isHealthy = Math.random() > 0.1; // 90% success rate

            await db
              .update(integrationStatus)
              .set({
                status: isHealthy ? "healthy" : "warning",
                lastCheckAt: new Date().toISOString(),
              })
              .where(eq(integrationStatus.id, status.id));

            return {
              name: status.integrationName,
              status: isHealthy ? "healthy" : "warning",
            };
          } catch (error) {
            console.error(`Health check failed for ${status.integrationName}:`, error);
            return {
              name: status.integrationName,
              status: "error",
            };
          }
        })
      );

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error("[Integration Health] Health check failed:", error);
      throw new Error("Health check failed");
    }
  }),
});
