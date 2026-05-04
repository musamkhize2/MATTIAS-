import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllApprovals,
  getAgentConfigs,
  getCommandHistory,
  getDb,
  getEvents,
  getMemoryEntries,
  getOrCreateDefaultTenant,
  getPendingApprovals,
  getPolicies,
  resolveApproval,
  saveCommandHistory,
  togglePolicy,
  updateTenantAutonomy,
  upsertAgentConfig,
  createPolicy,
} from "./db";
import { businessProfileRouter, integrationCredentialRouter } from "./mattias/businessProfileRouters";
import { companyRouter } from "./mattias/companyRouters";
import { businessPlanRouter } from "./mattias/businessPlanRouters";
import { agentFineTuningRouter } from "./mattias/agentFineTuningRouters";
import { extractFromWebsite, extractFromDocument } from "./mattias/documentIngestion";
import { scrapeCompanyWebsite, validateAndCleanCompanyData } from "./mattias/webScraper";
import { dataSourcesRouter, crmConnectorsRouter, webhooksRouter } from "./mattias/integrationRouters";
import { webhookReplayRouter, approvalReasoningRouter, crmOAuthRouter } from "./mattias/recommendationRouters";
import { workflowsRouter } from "./mattias/workflowRouters";
import {
  orchestrateEvent,
  runMATTIASCommand,
  searchMemory,
} from "./mattias/orchestrator";
import { AGENT_NAMES, EventTypes } from "./mattias/eventCatalog";
import { z } from "zod";

// ─── Tenant Helper ────────────────────────────────────────────────────────────

async function getTenantId(userId: number): Promise<number> {
  const tenant = await getOrCreateDefaultTenant(userId);
  return tenant.id;
}

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Tenant ────────────────────────────────────────────────────────────────
  tenant: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateDefaultTenant(ctx.user.id);
    }),

    updateAutonomy: protectedProcedure
      .input(
        z.object({
          level: z.enum(["manual", "assisted", "approval_guarded", "autonomous"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        await updateTenantAutonomy(tenantId, input.level);
        return { success: true };
      }),
  }),

  // ─── Events ────────────────────────────────────────────────────────────────
  events: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        return getEvents(tenantId, input.limit ?? 50, input.offset ?? 0);
      }),

    publish: protectedProcedure
      .input(
        z.object({
          eventType: z.string(),
          aggregateId: z.string(),
          aggregateType: z.string(),
          data: z.record(z.string(), z.unknown()),
          enableDebate: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenant = await getOrCreateDefaultTenant(ctx.user.id);
        const result = await orchestrateEvent({
          tenantId: tenant.id,
          userId: ctx.user.id,
          event: {
            eventType: input.eventType,
            aggregateId: input.aggregateId,
            aggregateType: input.aggregateType,
            occurredAt: new Date().toISOString(),
            data: input.data,
            metadata: { source: "user", tenantId: tenant.id },
          },
          autonomyLevel: tenant.autonomyLevel,
          enableDebate: input.enableDebate ?? false,
        });
        return result;
      }),

    // Simulate common events for demo purposes
    simulate: protectedProcedure
      .input(
        z.object({
          scenario: z.enum([
            "lead_captured",
            "cashflow_shortfall",
            "payment_approved",
            "contract_risk",
            "campaign_launched",
            "task_created",
          ]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenant = await getOrCreateDefaultTenant(ctx.user.id);

        const scenarios: Record<
          string,
          { eventType: string; aggregateType: string; data: Record<string, unknown> }
        > = {
          lead_captured: {
            eventType: EventTypes.LEAD_CAPTURED,
            aggregateType: "Lead",
            data: {
              name: "Jane Smith",
              email: "jane@acmecorp.com",
              source: "website",
              initialBudget: 25000,
              urgency: "high",
              industry: "Technology",
            },
          },
          cashflow_shortfall: {
            eventType: EventTypes.CASHFLOW_SHORTFALL_DETECTED,
            aggregateType: "FinancialAccount",
            data: {
              currentBalance: 4200,
              projectedShortfall: 8500,
              daysUntilShortfall: 14,
              suggestedActions: ["delay_expense", "accelerate_collections"],
            },
          },
          payment_approved: {
            eventType: EventTypes.PAYMENT_APPROVED,
            aggregateType: "Payment",
            data: {
              amount: 15000,
              recipient: "Supplier Corp",
              category: "Operations",
              approvedBy: "system",
            },
          },
          contract_risk: {
            eventType: EventTypes.CONTRACT_RISK_FLAGGED,
            aggregateType: "Contract",
            data: {
              contractId: "CTR-2024-089",
              riskType: "liability_clause",
              severity: "high",
              description: "Unlimited liability clause detected in Section 8.2",
            },
          },
          campaign_launched: {
            eventType: EventTypes.CAMPAIGN_LAUNCHED,
            aggregateType: "Campaign",
            data: {
              campaignName: "Q2 Growth Push",
              budget: 5000,
              channels: ["Google Ads", "LinkedIn"],
              targetAudience: "SME decision makers",
            },
          },
          task_created: {
            eventType: EventTypes.TASK_CREATED,
            aggregateType: "Task",
            data: {
              title: "Follow up with enterprise prospects",
              priority: "high",
              dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
              assignedTo: "team",
            },
          },
        };

        const scenario = scenarios[input.scenario]!;
        const result = await orchestrateEvent({
          tenantId: tenant.id,
          userId: ctx.user.id,
          event: {
            eventType: scenario.eventType,
            aggregateId: `demo-${Date.now()}`,
            aggregateType: scenario.aggregateType,
            occurredAt: new Date().toISOString(),
            data: scenario.data,
            metadata: { source: "user", tenantId: tenant.id },
          },
          autonomyLevel: tenant.autonomyLevel,
          enableDebate: true,
        });
        return result;
      }),
  }),

  // ─── Approvals ─────────────────────────────────────────────────────────────
  approvals: router({
    listPending: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantId(ctx.user.id);
      return getPendingApprovals(tenantId);
    }),

    listAll: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        return getAllApprovals(tenantId, input.limit ?? 50);
      }),

    resolve: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["APPROVED", "REJECTED"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        await resolveApproval(input.id, tenantId, input.status);
        return { success: true };
      }),
  }),

  // ─── Policies ──────────────────────────────────────────────────────────────
  dataSources: dataSourcesRouter,
  crmConnectors: crmConnectorsRouter,
  webhooks: webhooksRouter,
  workflows: workflowsRouter,
  businessPlan: businessPlanRouter,
  agentFineTuning: agentFineTuningRouter,
  webhookReplay: webhookReplayRouter,
  approvalReasoning: approvalReasoningRouter,
  crmOAuth: crmOAuthRouter,
  businessProfiles: businessProfileRouter,
  integrationCredentials: integrationCredentialRouter,
  company: companyRouter,

  // ─── Company Web Scraper ──────────────────────────────────────────────────
  companyWebScraper: router({
    scrapeWebsite: protectedProcedure
      .input(z.object({ url: z.string() }))
      .mutation(async ({ input }) => {
        try {
          let url = input.url.trim();
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
          }

          // Verify URL is online before scraping
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            await fetch(url, {
              method: "HEAD",
              signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));
            clearTimeout(timeoutId);
          } catch (fetchError) {
            // Try GET request if HEAD fails
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            await fetch(url, {
              signal: controller.signal,
              headers: { "User-Agent": "Mozilla/5.0" },
            }).finally(() => clearTimeout(timeoutId));
            clearTimeout(timeoutId);
          }

          const scrapedData = await scrapeCompanyWebsite(url);
          const cleanedData = validateAndCleanCompanyData(scrapedData);
          return {
            success: true,
            data: cleanedData,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      }),
  }),

  // ─── Document Ingestion ────────────────────────────────────────────────────
  documentIngestion: router({
    extractFromWebsite: protectedProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        return extractFromWebsite(input.url);
      }),

    extractFromDocument: protectedProcedure
      .input(z.object({ text: z.string(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        return extractFromDocument(input.text, input.name);
      }),
  }),
  policies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantId(ctx.user.id);
      return getPolicies(tenantId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          eventConditions: z.record(z.string(), z.unknown()),
          actionConditions: z.record(z.string(), z.unknown()).optional(),
          effect: z.enum(["ALLOW", "DENY", "REQUIRE_APPROVAL"]),
          precedence: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        const id = await createPolicy({ tenantId, ...input });
        return { id };
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        await togglePolicy(input.id, tenantId, input.enabled);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        const db = await getDb();
        if (!db) return { success: false };
        const { policies: policiesTable } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.delete(policiesTable).where(and(eq(policiesTable.id, input.id), eq(policiesTable.tenantId, tenantId)));
        return { success: true };
      }),
  }),

  // ─── Memory ────────────────────────────────────────────────────────────────
  memory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        return getMemoryEntries(tenantId, input.limit ?? 30);
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        return searchMemory(tenantId, input.query, 10);
      }),
  }),

  // ─── Agents ────────────────────────────────────────────────────────────────
  agents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantId(ctx.user.id);
      const configs = await getAgentConfigs(tenantId);
      const configMap = new Map(configs.map((c) => [c.agentName, c]));

      return Object.values(AGENT_NAMES)
        .filter((name) => name !== AGENT_NAMES.CRITIC)
        .map((name) => {
          const config = configMap.get(name);
          return {
            name,
            enabled: config?.enabled ?? true,
            config: config?.config ?? {},
          };
        });
    }),

    toggle: protectedProcedure
      .input(z.object({ agentName: z.string(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        await upsertAgentConfig(tenantId, input.agentName, {}, input.enabled);
        return { success: true };
      }),
  }),

  // ─── MATTIAS Command Interface ─────────────────────────────────────────────
  command: router({
    send: protectedProcedure
      .input(
        z.object({
          message: z.string(),
          history: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenant = await getOrCreateDefaultTenant(ctx.user.id);
        const result = await runMATTIASCommand({
          tenantId: tenant.id,
          userId: ctx.user.id,
          command: input.message,
          history: input.history ?? [],
        });

        await saveCommandHistory({
          tenantId: tenant.id,
          userId: ctx.user.id,
          command: input.message,
          response: result.response,
          agentsInvolved: result.agentsInvolved,
        });

        return result;
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantId(ctx.user.id);
        return getCommandHistory(tenantId, input.limit ?? 20);
      }),
  }),

  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const [recentEvents, pendingApprovals, memoryEntries] = await Promise.all([
        getEvents(tenant.id, 100),
        getPendingApprovals(tenant.id),
        getMemoryEntries(tenant.id, 100),
      ]);

      // Count events by type
      const eventTypeCounts: Record<string, number> = {};
      for (const e of recentEvents) {
        eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] ?? 0) + 1;
      }

      // Agent activity
      const agentActivity: Record<string, number> = {};
      for (const a of pendingApprovals) {
        if (a.agentName) {
          agentActivity[a.agentName] = (agentActivity[a.agentName] ?? 0) + 1;
        }
      }

      return {
        totalEvents: recentEvents.length,
        pendingApprovals: pendingApprovals.length,
        memoryEntries: memoryEntries.length,
        autonomyLevel: tenant.autonomyLevel,
        subscriptionTier: tenant.subscriptionTier,
        eventTypeCounts,
        agentActivity,
        recentEvents: recentEvents.slice(0, 10),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
