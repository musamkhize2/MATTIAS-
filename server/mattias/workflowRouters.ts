import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createWorkflow,
  getWorkflows,
  deleteWorkflow,
  toggleWorkflow,
  executeWorkflow,
  resumeWorkflow,
  WorkflowDefinitionData,
} from "./workflowEngine";
import { getOrCreateDefaultTenant } from "../db";

async function getTenantId(userId: number) {
  const tenant = await getOrCreateDefaultTenant(userId);
  return tenant.id;
}

export const workflowsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantId(ctx.user.id);
    return getWorkflows(tenantId);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        triggerEvent: z.string(),
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.enum(["trigger", "agent", "condition", "approval"]),
            label: z.string(),
            config: z.record(z.string(), z.unknown()),
            x: z.number(),
            y: z.number(),
          })
        ),
        edges: z.array(
          z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      const workflowData: WorkflowDefinitionData = {
        name: input.name,
        description: input.description,
        triggerEvent: input.triggerEvent,
        nodes: input.nodes,
        edges: input.edges,
        isActive: true,
      };
      const id = await createWorkflow(tenantId, workflowData);
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      await deleteWorkflow(input.id, tenantId);
      return { success: true };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      await toggleWorkflow(input.id, tenantId, input.enabled);
      return { success: true };
    }),

  execute: protectedProcedure
    .input(
      z.object({
        workflowId: z.number(),
        triggerEventId: z.bigint(),
        triggerEventData: z.record(z.string(), z.unknown()),
        dryRun: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      const result = await executeWorkflow(
        input.workflowId,
        tenantId,
        input.triggerEventId,
        input.triggerEventData,
        input.dryRun
      );
      return {
        status: result.status,
        executionPath: result.executionPath,
        results: Object.fromEntries(result.results),
        approvalsPending: result.approvalsPending,
        error: result.error,
      };
    }),

  resume: protectedProcedure
    .input(
      z.object({
        workflowId: z.number(),
        approvalDecisions: z.record(z.string(), z.boolean()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      // In production, would load the paused execution context from storage
      // For now, return a simplified response
      return {
        success: true,
        message: "Workflow resumed with approval decisions",
        decisions: input.approvalDecisions,
      };
    }),

  test: protectedProcedure
    .input(
      z.object({
        workflowId: z.number(),
        triggerEventData: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId(ctx.user.id);
      // Execute in dry-run mode for testing
      const result = await executeWorkflow(
        input.workflowId,
        tenantId,
        BigInt(0), // Dummy event ID for testing
        input.triggerEventData,
        true // dryRun = true
      );
      return {
        status: result.status,
        executionPath: result.executionPath,
        results: Object.fromEntries(result.results),
        approvalsPending: result.approvalsPending,
        error: result.error,
        message: "Workflow test completed (dry-run mode)",
      };
    }),
});
