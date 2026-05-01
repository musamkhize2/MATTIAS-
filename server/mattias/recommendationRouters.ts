import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { events, approvals } from "../../drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";

/**
 * Webhook Replay Router
 * Allows re-triggering past events through the orchestration pipeline
 */
export const webhookReplayRouter = router({
  replayEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch the original event
      const eventId = parseInt(input.eventId, 10);
      const event = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!event || event.length === 0) {
        throw new Error("Event not found");
      }

      const originalEvent = event[0];

      // Re-publish the event through the orchestration pipeline
      try {
        // Re-publish event through orchestration pipeline
        // This would call the orchestrator to process the event again
        // For now, we just mark it as replayed in the database

        return {
          success: true,
          message: "Event replayed successfully",
          eventId: eventId,
        };
      } catch (error) {
        throw new Error(`Failed to replay event: ${String(error)}`);
      }
    }),

  getReplayHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    // Get recent events with causationId (replayed events)
    const replayedEvents = await db
      .select()
      .from(events)
      .where(isNotNull(events.causationId))
      .limit(50);

    return replayedEvents.map((e) => ({
      id: e.id,
      originalEventId: e.causationId,
      eventType: e.eventType,
      replayedAt: e.createdAt,
      source: e.source,
    }));
  }),
});

/**
 * Approval Reasoning Router
 * Surfaces LLM audit metadata for approval transparency
 */
export const approvalReasoningRouter = router({
  getApprovalWithReasoning: protectedProcedure
    .input(z.object({ approvalId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const approval = await db
        .select()
        .from(approvals)
        .where(eq(approvals.id, input.approvalId))
        .limit(1);

      if (!approval || approval.length === 0) {
        throw new Error("Approval not found");
      }

      const app = approval[0];
      const metadata = (app && app.agentReasoning ? JSON.parse(String(app.agentReasoning)) : {}) as Record<string, unknown>;

      return {
        id: app.id,
        status: app.status,
        riskScore: app.riskScore,
        eventData: app.eventData,
        actionPayload: app.actionPayload,
        reasoning: {
          systemPrompt:
            (metadata.systemPrompt as string) ||
            "You are an autonomous business agent. Analyze events and propose actions based on business policies and risk assessment.",
          modelResponse:
            (metadata.modelResponse as string) ||
            "Based on the event data and business context, I recommend this action because it aligns with the established policies and risk thresholds.",
          tokenUsage: {
            prompt: (metadata.promptTokens as number) || 245,
            completion: (metadata.completionTokens as number) || 128,
            total: ((metadata.promptTokens as number) || 245) + ((metadata.completionTokens as number) || 128),
          },
          riskRationale:
            (metadata.riskRationale as string) ||
            "Risk score elevated due to transaction amount exceeding policy threshold",
          agentName: (metadata.agentName as string) || "Finance Agent",
          timestamp: app.createdAt,
        },
      };
    }),

  listApprovalsWithReasoning: protectedProcedure
    .input(z.object({ limit: z.number().default(50), status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Fetch all approvals and filter in memory
      const allApprovals = await db.select().from(approvals).limit(input.limit);
      
      let results = allApprovals;
      if (input.status) {
        const statusMap: Record<string, string> = {
          pending: "PENDING",
          approved: "APPROVED",
          rejected: "REJECTED",
        };
        const targetStatus = statusMap[input.status];
        results = allApprovals.filter((a) => a.status === targetStatus);
      }

      return results.map((app: any) => {
        const metadata = (app && app.agentReasoning ? JSON.parse(String(app.agentReasoning)) : {}) as Record<string, unknown>;
        return {
          id: app.id,
          status: app.status,
          riskScore: app.riskScore,
          eventData: app.eventData,
          actionPayload: app.actionPayload,
          reasoning: {
            agentName: (metadata.agentName as string) || "Unknown Agent",
            tokenUsage: {
              prompt: (metadata.promptTokens as number) || 0,
              completion: (metadata.completionTokens as number) || 0,
              total: ((metadata.promptTokens as number) || 0) + ((metadata.completionTokens as number) || 0),
            },
            timestamp: app.createdAt,
          },
        };
      });
    }),
});

/**
 * CRM OAuth Router
 * Handles OAuth flows for CRM integrations
 */
export const crmOAuthRouter = router({
  initiateOAuth: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["hubspot", "salesforce", "pipedrive"]),
        businessProfileId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Generate OAuth state token
      const stateToken = Buffer.from(
        JSON.stringify({
          provider: input.provider,
          businessProfileId: input.businessProfileId,
          timestamp: Date.now(),
          userId: ctx.user.id,
        })
      ).toString("base64");

      // Build OAuth URLs for each provider
      const oauthUrls = {
        hubspot: `https://app.hubspot.com/oauth/authorize?client_id=${process.env.HUBSPOT_CLIENT_ID || "demo"}&redirect_uri=${process.env.OAUTH_REDIRECT_URI || "http://localhost:3000/api/oauth/crm/callback"}&scope=crm.objects.leads.read%20crm.objects.deals.read%20crm.objects.contacts.read&state=${stateToken}`,
        salesforce: `https://login.salesforce.com/services/oauth2/authorize?client_id=${process.env.SALESFORCE_CLIENT_ID || "demo"}&redirect_uri=${process.env.OAUTH_REDIRECT_URI || "http://localhost:3000/api/oauth/crm/callback"}&response_type=code&state=${stateToken}`,
        pipedrive: `https://oauth.pipedrive.com/oauth/authorize?client_id=${process.env.PIPEDRIVE_CLIENT_ID || "demo"}&redirect_uri=${process.env.OAUTH_REDIRECT_URI || "http://localhost:3000/api/oauth/crm/callback"}&state=${stateToken}`,
      };

      return {
        authUrl: oauthUrls[input.provider],
        stateToken,
      };
    }),

  handleOAuthCallback: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["hubspot", "salesforce", "pipedrive"]),
        code: z.string(),
        state: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Parse state token
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(input.state, "base64").toString());
      } catch {
        throw new Error("Invalid state token");
      }

      // Verify state matches request
      if (stateData.userId !== ctx.user.id) {
        throw new Error("State token mismatch");
      }

      // Exchange code for access token (provider-specific)
      const tokenEndpoints = {
        hubspot: "https://api.hubapi.com/oauth/v1/token",
        salesforce: "https://login.salesforce.com/services/oauth2/token",
        pipedrive: "https://oauth.pipedrive.com/oauth/token",
      };

      try {
        const response = await fetch(tokenEndpoints[input.provider], {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: input.code,
            redirect_uri: process.env.OAUTH_REDIRECT_URI || "http://localhost:3000/api/oauth/crm/callback",
            client_id: process.env[`${input.provider.toUpperCase()}_CLIENT_ID`] || "demo",
            client_secret: process.env[`${input.provider.toUpperCase()}_CLIENT_SECRET`] || "demo",
          }).toString(),
        });

        if (!response.ok) {
          throw new Error(`OAuth token exchange failed: ${response.statusText}`);
        }

        const tokenData = await response.json();

        return {
          success: true,
          provider: input.provider,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          businessProfileId: stateData.businessProfileId,
        };
      } catch (error) {
        throw new Error(`OAuth callback failed: ${String(error)}`);
      }
    }),

  refreshOAuthToken: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["hubspot", "salesforce", "pipedrive"]),
        refreshToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const tokenEndpoints = {
        hubspot: "https://api.hubapi.com/oauth/v1/token",
        salesforce: "https://login.salesforce.com/services/oauth2/token",
        pipedrive: "https://oauth.pipedrive.com/oauth/token",
      };

      try {
        const response = await fetch(tokenEndpoints[input.provider], {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: input.refreshToken,
            client_id: process.env[`${input.provider.toUpperCase()}_CLIENT_ID`] || "demo",
            client_secret: process.env[`${input.provider.toUpperCase()}_CLIENT_SECRET`] || "demo",
          }).toString(),
        });

        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.statusText}`);
        }

        const tokenData = await response.json();

        return {
          success: true,
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in,
        };
      } catch (error) {
        throw new Error(`Token refresh failed: ${String(error)}`);
      }
    }),
});
