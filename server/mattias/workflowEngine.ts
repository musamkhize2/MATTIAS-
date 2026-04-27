import { getDb } from "../db";
import { workflowDefinitions, events } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { runAgent } from "./orchestrator";
import { EventTypes } from "./eventCatalog";

export interface WorkflowNode {
  id: string;
  type: "trigger" | "agent" | "condition" | "approval";
  label: string;
  config: Record<string, unknown>;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowDefinitionData {
  name: string;
  description?: string;
  triggerEvent: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
}

export interface WorkflowExecutionContext {
  workflowId: number;
  triggerEventId: bigint;
  triggerEventData: Record<string, unknown>;
  currentNodeId: string;
  executionPath: string[];
  results: Map<string, unknown>;
  approvalsPending: Array<{ nodeId: string; action: string }>;
  status: "running" | "paused" | "completed" | "failed";
  error?: string;
}

// ─── Workflow Management ───────────────────────────────────────────────────────

export async function createWorkflow(
  tenantId: number,
  data: WorkflowDefinitionData
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(workflowDefinitions).values({
    tenantId,
    name: data.name,
    startEventType: data.triggerEvent,
    definition: {
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
    },
    enabled: data.isActive,
  });

  return (result as unknown as { insertId: number }).insertId;
}

export async function getWorkflows(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.tenantId, tenantId));
}

export async function deleteWorkflow(workflowId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.id, workflowId),
        eq(workflowDefinitions.tenantId, tenantId)
      )
    );

  return true;
}

export async function toggleWorkflow(
  workflowId: number,
  tenantId: number,
  enabled: boolean
) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(workflowDefinitions)
    .set({ enabled })
    .where(
      and(
        eq(workflowDefinitions.id, workflowId),
        eq(workflowDefinitions.tenantId, tenantId)
      )
    );

  return true;
}

// ─── Workflow Execution ────────────────────────────────────────────────────────

export async function executeWorkflow(
  workflowId: number,
  tenantId: number,
  triggerEventId: bigint,
  triggerEventData: Record<string, unknown>,
  dryRun: boolean = false
): Promise<WorkflowExecutionContext> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the workflow definition
  const workflows = await db
    .select()
    .from(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.id, workflowId),
        eq(workflowDefinitions.tenantId, tenantId)
      )
    );

  if (!workflows.length) throw new Error("Workflow not found");

  const workflow = workflows[0];
  const definition = workflow.definition as any;
  const nodes = definition.nodes as WorkflowNode[];
  const edges = definition.edges as WorkflowEdge[];

  const startNodeId = findStartNode(nodes);
  if (!startNodeId) {
    const context: WorkflowExecutionContext = {
      workflowId,
      triggerEventId,
      triggerEventData,
      currentNodeId: "",
      executionPath: [],
      results: new Map(),
      approvalsPending: [],
      status: "failed",
      error: "No start node found",
    };
    return context;
  }

  const context: WorkflowExecutionContext = {
    workflowId,
    triggerEventId,
    triggerEventData,
    currentNodeId: startNodeId,
    executionPath: [],
    results: new Map(),
    approvalsPending: [],
    status: "running",
  };

  if (!context.currentNodeId) {
    context.status = "failed";
    context.error = "No start node found";
    return context;
  }

  // Execute the workflow
  while (context.status === "running") {
    const currentNode = nodes.find((n) => n.id === context.currentNodeId);
    if (!currentNode) {
      context.status = "failed";
      context.error = "Current node not found";
      break;
    }

    context.executionPath.push(context.currentNodeId);

    try {
      // Execute the node based on its type
      switch (currentNode.type) {
        case "trigger":
          // Trigger node just passes through
          break;

        case "agent":
          // Execute agent action
          if (!dryRun) {
            const result = await executeAgentNode(
              currentNode,
              triggerEventData,
              tenantId
            );
            context.results.set(currentNode.id, result);
          } else {
            context.results.set(currentNode.id, { dryRun: true, action: currentNode.label });
          }
          break;

        case "condition":
          // Evaluate condition
          const conditionMet = evaluateCondition(
            currentNode,
            triggerEventData,
            context.results
          );
          if (!conditionMet) {
            // Find alternative path or end
            const nextNode = findNextNode(edges, currentNode.id, false);
            if (nextNode) {
              context.currentNodeId = nextNode;
              continue;
            } else {
              context.status = "completed";
              break;
            }
          }
          break;

        case "approval":
          // Mark as pending approval
          context.approvalsPending.push({
            nodeId: currentNode.id,
            action: currentNode.label,
          });
          context.status = "paused";
          break;
      }

      // Move to next node
      if (context.status === "running") {
        const nextNode = findNextNode(edges, context.currentNodeId, true);
        if (nextNode) {
          context.currentNodeId = nextNode;
        } else {
          context.status = "completed";
        }
      }
    } catch (error) {
      context.status = "failed";
      context.error = (error as Error).message;
    }
  }

  return context;
}

export async function resumeWorkflow(
  context: WorkflowExecutionContext,
  approvalDecisions: Record<string, boolean>
): Promise<WorkflowExecutionContext> {
  // Process approval decisions
  for (const [nodeId, approved] of Object.entries(approvalDecisions)) {
    if (!approved) {
      context.status = "failed";
      context.error = `Approval rejected at node ${nodeId}`;
      return context;
    }
  }

  // Resume execution from paused state
  context.status = "running";
  context.approvalsPending = [];

  // Continue execution (simplified - in production, would resume from saved state)
  return context;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function findStartNode(nodes: WorkflowNode[]): string | undefined {
  const triggerNode = nodes.find((n) => n.type === "trigger");
  return triggerNode?.id;
}

function findNextNode(
  edges: WorkflowEdge[],
  currentNodeId: string,
  success: boolean
): string | undefined {
  const outgoing = edges.filter((e) => e.source === currentNodeId);
  if (outgoing.length === 0) return undefined;

  // Simple logic: take first edge (in production, would handle success/failure paths)
  return outgoing[0].target;
}

async function executeAgentNode(
  node: WorkflowNode,
  eventData: Record<string, unknown>,
  tenantId: number
): Promise<Record<string, unknown>> {
  // Map node config to agent execution
  const agentName = (node.config.agent as string) || "operations";

  // In production, would call the appropriate agent
  return {
    nodeId: node.id,
    agentName,
    action: node.label,
    eventData,
    timestamp: new Date().toISOString(),
  };
}

function evaluateCondition(
  node: WorkflowNode,
  eventData: Record<string, unknown>,
  results: Map<string, unknown>
): boolean {
  // Simple condition evaluation
  const condition = node.config.condition as string;
  if (!condition) return true;

  // In production, would implement full expression evaluation
  // For now, just return true (pass through)
  return true;
}
