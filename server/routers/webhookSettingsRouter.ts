import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const webhookSettingsRouter = router({
  /**
   * Get webhook settings for the current tenant
   */
  getSettings: publicProcedure.query(async ({ ctx }: any) => {
    if (!ctx.user?.tenantId) {
      throw new Error("No tenant associated with user");
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.user.tenantId))
      .limit(1);

    if (!tenant || tenant.length === 0) {
      return {
        customDomain: "",
        notificationEmail: "",
        slackWebhookUrl: "",
      };
    }

    const features = (tenant[0].features as any) || {};
    return {
      customDomain: features.customDomain || "",
      notificationEmail: features.notificationEmail || "",
      slackWebhookUrl: features.slackWebhookUrl || "",
    };
  }),

  /**
   * Update webhook settings for the current tenant
   */
  updateSettings: publicProcedure
    .input(
      z.object({
        customDomain: z.string().optional(),
        notificationEmail: z.string().email().optional(),
        slackWebhookUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      if (!ctx.user?.tenantId) {
        throw new Error("No tenant associated with user");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Get current tenant
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, ctx.user.tenantId))
        .limit(1);

      if (!tenant || tenant.length === 0) {
        throw new Error("Tenant not found");
      }

      // Merge new settings with existing features
      const currentFeatures = (tenant[0].features as any) || {};
      const updatedFeatures = {
        ...currentFeatures,
        customDomain: input.customDomain ?? currentFeatures.customDomain,
        notificationEmail: input.notificationEmail ?? currentFeatures.notificationEmail,
        slackWebhookUrl: input.slackWebhookUrl ?? currentFeatures.slackWebhookUrl,
      };

      // Update tenant with new features
      await db
        .update(tenants)
        .set({
          features: updatedFeatures,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, ctx.user.tenantId));

      return {
        success: true,
        customDomain: updatedFeatures.customDomain,
        notificationEmail: updatedFeatures.notificationEmail,
        slackWebhookUrl: updatedFeatures.slackWebhookUrl,
      };
    }),
});
