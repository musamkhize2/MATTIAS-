import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { emailCampaigns, actionHistory } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Campaign Analytics Router
 * Provides metrics and analytics for email campaigns
 */

export const analyticsRouter = router({
  /**
   * Get campaign metrics
   */
  getCampaignMetrics: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: "Database not available",
            metrics: null,
          };
        }

        // Get campaign data
        const campaign = await db
          .select()
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId))
          .limit(1);

        if (!campaign || campaign.length === 0) {
          return {
            success: false,
            error: "Campaign not found",
            metrics: null,
          };
        }

        const campaignData = campaign[0];

        // Get action history for this campaign
        const actions = await db
          .select()
          .from(actionHistory)
          .where(
            and(
              eq(actionHistory.actionId, campaignData.actionId || ""),
              eq(actionHistory.status, "completed")
            )
          );

        // Calculate metrics
        const sentCount = actions.length;
        const openCount = actions.filter((a) => {
          const meta = (a.metadata as any) || {};
          return meta?.opened;
        }).length;
        const clickCount = actions.filter((a) => {
          const meta = (a.metadata as any) || {};
          return meta?.clicked;
        }).length;
        const bounceCount = actions.filter((a) => {
          const meta = (a.metadata as any) || {};
          return meta?.bounced;
        }).length;

        const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
        const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;

        return {
          success: true,
          metrics: {
            campaignId: campaignData.id,
            campaignName: campaignData.name,
            status: campaignData.status,
            sentCount,
            openCount,
            clickCount,
            bounceCount,
            openRate: Math.round(openRate * 100) / 100,
            clickRate: Math.round(clickRate * 100) / 100,
            bounceRate: Math.round(bounceRate * 100) / 100,
            conversionRate: 0, // Will be calculated from tracking data
              createdAt: campaignData.createdAt,
              completedAt: (campaignData as any).completedAt || null,
          },
        };
      } catch (error) {
        console.error("Error getting campaign metrics:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          metrics: null,
        };
      }
    }),

  /**
   * Get all campaigns with summary metrics
   */
  getAllCampaignsMetrics: publicProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();

        // Get campaigns
        if (!db) {
          return {
            success: true,
            campaigns: [],
            total: 0,
          };
        }
        const campaigns = await db
          .select()
          .from(emailCampaigns)
          .limit(input.limit)
          .offset(input.offset);

        // Get metrics for each campaign
        const campaignsWithMetrics = await Promise.all(
          campaigns.map(async (campaign) => {
            const actions = await db
              .select()
              .from(actionHistory)
              .where(
                and(
                  eq(actionHistory.actionId, campaign.actionId || ""),
                  eq(actionHistory.status, "completed")
                )
              );

            const sentCount = actions.length;
            const openCount = actions.filter((a) => {
              const meta = (a.metadata as any) || {};
              return meta?.opened;
            }).length;
            const clickCount = actions.filter((a) => {
              const meta = (a.metadata as any) || {};
              return meta?.clicked;
            }).length;

            const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
            const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;

            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              sentCount,
              openRate: Math.round(openRate * 100) / 100,
              clickRate: Math.round(clickRate * 100) / 100,
              createdAt: campaign.createdAt,
              completedAt: (campaign as any).completedAt || null,
            };
          })
        );

        return {
          success: true,
          campaigns: campaignsWithMetrics,
          total: campaigns.length,
        };
      } catch (error) {
        console.error("Error getting campaigns metrics:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          campaigns: [],
          total: 0,
        };
      }
    }),

  /**
   * Get campaign performance comparison
   */
  getPerformanceComparison: publicProcedure
    .input(
      z.object({
        campaignIds: z.array(z.string()),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: true,
            comparison: [],
          };
        }

        const comparison = await Promise.all(
          input.campaignIds.map(async (campaignId) => {
            const campaign = await db
              .select()
              .from(emailCampaigns)
              .where(eq(emailCampaigns.id, campaignId))
              .limit(1);

            if (!campaign || campaign.length === 0) {
              return null;
            }

            const campaignData = campaign[0];
            const actions = await db
              .select()
              .from(actionHistory)
              .where(
                and(
                  eq(actionHistory.actionId, campaignData.actionId || ""),
                  eq(actionHistory.status, "completed")
                )
              );

            const sentCount = actions.length;
            const openCount = actions.filter((a) => {
              const meta = (a.metadata as any) || {};
              return meta?.opened;
            }).length;
            const clickCount = actions.filter((a) => {
              const meta = (a.metadata as any) || {};
              return meta?.clicked;
            }).length;

            return {
              campaignId: campaignData.id,
              campaignName: campaignData.name,
              sentCount,
              openRate: sentCount > 0 ? (openCount / sentCount) * 100 : 0,
              clickRate: sentCount > 0 ? (clickCount / sentCount) * 100 : 0,
            };
          })
        );

        return {
          success: true,
          comparison: comparison.filter((c) => c !== null),
        };
      } catch (error) {
        console.error("Error getting performance comparison:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          comparison: [],
        };
      }
    }),

  /**
   * Get engagement timeline
   */
  getEngagementTimeline: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: "Database not available",
            timeline: [],
          };
        }

        // Get campaign
        const campaign = await db
          .select()
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId))
          .limit(1);

        if (!campaign || campaign.length === 0) {
          return {
            success: false,
            error: "Campaign not found",
            timeline: [],
          };
        }

        const campaignData = campaign[0];

        // Get action history with date filtering
        let whereConditions = [eq(actionHistory.actionId, campaignData.actionId || "")];

        if (input.startDate) {
          whereConditions.push(gte(actionHistory.createdAt, input.startDate));
        }

        if (input.endDate) {
          whereConditions.push(lte(actionHistory.createdAt, input.endDate));
        }

        const actions = await db
          .select()
          .from(actionHistory)
          .where(and(...whereConditions));

        // Group by date
        const timeline: Record<string, { opens: number; clicks: number }> = {};

                actions.forEach((action) => {
          const date = new Date(action.createdAt).toISOString().split("T")[0];
          if (!timeline[date]) {
            timeline[date] = { opens: 0, clicks: 0 };
          }
          const meta = (action.metadata as any) || {};
          if (meta?.opened) {
            timeline[date].opens++;
          }
          if (meta?.clicked) {
            timeline[date].clicks++;
          }
        });

        return {
          success: true,
          timeline: Object.entries(timeline).map(([date, metrics]) => ({
            date,
            ...metrics,
          })),
        };
      } catch (error) {
        console.error("Error getting engagement timeline:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timeline: [],
        };
      }
    }),

  /**
   * Get recipient engagement details
   */
  getRecipientEngagement: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        recipientEmail: z.string().email(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: "Database not available",
            engagement: null,
          };
        }

        // Get campaign
        const campaign = await db
          .select()
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.campaignId))
          .limit(1);

        if (!campaign || campaign.length === 0) {
          return {
            success: false,
            error: "Campaign not found",
            engagement: null,
          };
        }

        const campaignData = campaign[0];

        // Get action history for this recipient
            const actions = await db
              .select()
              .from(actionHistory)
              .where(
                and(
                  eq(actionHistory.actionId, campaignData.actionId || ""),
                  eq(actionHistory.metadata, JSON.stringify({ email: input.recipientEmail }))
                )
              );

            const metadata = actions.length > 0 ? (actions[0].metadata as any) || {} : {};

            const engagement = {
              email: input.recipientEmail,
              campaignId: campaignData.id,
              campaignName: campaignData.name,
              sent: actions.length > 0,
              opened: metadata?.opened || false,
              clicked: metadata?.clicked || false,
              bounced: metadata?.bounced || false,
              actions: actions.map((a) => {
                const meta = (a.metadata as any) || {};
                return {
                  type: meta?.type || "unknown",
                  timestamp: a.createdAt,
                };
              }),
            };

        return {
          success: true,
          engagement,
        };
      } catch (error) {
        console.error("Error getting recipient engagement:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          engagement: null,
        };
      }
    }),
});
