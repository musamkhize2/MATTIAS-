import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { agentConfigs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const agentFineTuningRouter = router({
  /**
   * Get agent configuration
   */
  getConfig: protectedProcedure
    .input(z.object({ agentName: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const config = await db
        .select()
        .from(agentConfigs)
        .where(eq(agentConfigs.agentName, input.agentName))
        .limit(1);

      if (config.length === 0) {
        return {
          agentName: input.agentName,
          personality: 50,
          riskTolerance: 50,
          customPrompt: "",
          performanceScore: 0,
          successRate: 0,
          avgResponseTime: 0,
          decisionsCount: 0,
        };
      }

      const cfg = config[0];
      const configData = (cfg.config as Record<string, unknown>) || {};
      return {
        agentName: cfg.agentName,
        personality: (configData.personality as number) || 50,
        riskTolerance: (configData.riskTolerance as number) || 50,
        customPrompt: (configData.customPrompt as string) || "",
        performanceScore: (configData.performanceScore as number) || 0,
        successRate: (configData.successRate as number) || 0,
        avgResponseTime: (configData.avgResponseTime as number) || 0,
        decisionsCount: (configData.decisionsCount as number) || 0,
      };
    }),

  /**
   * Update agent configuration
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        agentName: z.string(),
        personality: z.number().min(0).max(100),
        riskTolerance: z.number().min(0).max(100),
        customPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const configData = {
        personality: input.personality,
        riskTolerance: input.riskTolerance,
        customPrompt: input.customPrompt || "",
      };

      // Check if config exists
      const existing = await db
        .select()
        .from(agentConfigs)
        .where(eq(agentConfigs.agentName, input.agentName))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(agentConfigs)
          .set({
            config: configData,
            updatedAt: new Date(),
          })
          .where(eq(agentConfigs.agentName, input.agentName));
      } else {
        // Create new
        await db.insert(agentConfigs).values({
          tenantId: ctx.user?.id || 1,
          agentName: input.agentName,
          config: configData,
          enabled: true,
          updatedAt: new Date(),
        });
      }

      return { success: true, agentName: input.agentName };
    }),

  /**
   * Get all agent configurations
   */
  getAllConfigs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const configs = await db.select().from(agentConfigs);
    return configs.map((cfg) => ({
      agentName: cfg.agentName,
      config: cfg.config,
      enabled: cfg.enabled,
    }));
  }),

  /**
   * Start A/B test for agent configuration
   */
  startABTest: protectedProcedure
    .input(
      z.object({
        agentName: z.string(),
        variantA: z.object({
          personality: z.number(),
          riskTolerance: z.number(),
        }),
        variantB: z.object({
          personality: z.number(),
          riskTolerance: z.number(),
        }),
        sampleSize: z.number().default(100),
      })
    )
    .mutation(async ({ input }) => {
      // Placeholder: In production, create experiment record and track metrics
      return {
        success: true,
        experimentId: `ab_test_${input.agentName}_${Date.now()}`,
        status: "running",
        variantA: input.variantA,
        variantB: input.variantB,
        sampleSize: input.sampleSize,
      };
    }),

  /**
   * Get agent performance metrics
   */
  getMetrics: protectedProcedure
    .input(z.object({ agentName: z.string() }))
    .query(async ({ input }) => {
      // Placeholder: In production, aggregate real metrics from event logs
      return {
        agentName: input.agentName,
        successRate: 87,
        avgResponseTime: 1.2,
        decisionsCount: 847,
        averageRiskScore: 65,
        approvalRate: 45,
        autonomousExecutionRate: 55,
      };
    }),

  /**
   * Reset agent configuration to defaults
   */
  resetConfig: protectedProcedure
    .input(z.object({ agentName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const defaultConfig = {
        personality: 50,
        riskTolerance: 50,
        customPrompt: "",
      };

      await db
        .update(agentConfigs)
        .set({
          config: defaultConfig,
          updatedAt: new Date(),
        })
        .where(eq(agentConfigs.agentName, input.agentName));

      return { success: true };
    }),
});
