import { useState } from "react";
import { Plus, Trash2, Play, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface WorkflowNode {
  id: string;
  type: "trigger" | "agent" | "condition" | "approval";
  label: string;
  config: Record<string, unknown>;
  x: number;
  y: number;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

const NODE_TYPES = [
  { type: "trigger", label: "Event Trigger", icon: "⚡", color: "oklch(0.75 0.18 75)" },
  { type: "agent", label: "Agent Action", icon: "🤖", color: "oklch(0.65 0.22 270)" },
  { type: "condition", label: "Condition", icon: "🔀", color: "oklch(0.68 0.2 145)" },
  { type: "approval", label: "Approval Gate", icon: "✓", color: "oklch(0.6 0.22 25)" },
];

export default function WorkflowBuilder() {
  const [workflowName, setWorkflowName] = useState("");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<string | null>(null);

  const addNode = (type: string, x: number, y: number) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: type as any,
      label: NODE_TYPES.find((n) => n.type === type)?.label || type,
      config: {},
      x,
      y,
    };
    setNodes([...nodes, newNode]);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedType) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addNode(draggedType, x, y);
    setDraggedType(null);
  };

  const handleNodeDrag = (id: string, e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(nodes.map((n) => (n.id === id ? { ...n, x, y } : n)));
  };

  return (
    <div className="p-6 space-y-6 h-screen flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Workflow Builder</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
            Create multi-step automations by chaining agents, conditions, and approvals
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-sm gap-2"
            style={{ borderColor: "oklch(0.25 0.02 260)", color: "oklch(0.6 0.02 260)" }}
          >
            <Play size={14} />
            Test
          </Button>
          <Button
            className="text-sm gap-2"
            style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
          >
            <Save size={14} />
            Save Workflow
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <div
          className="w-48 rounded-xl p-4 space-y-3 overflow-y-auto"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
        >
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow name"
            className="text-xs"
            style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)", color: "white" }}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-white">Nodes</p>
            {NODE_TYPES.map((nodeType) => (
              <div
                key={nodeType.type}
                draggable
                onDragStart={() => setDraggedType(nodeType.type)}
                onDragEnd={() => setDraggedType(null)}
                className="p-2 rounded-lg cursor-move hover:bg-white/10 transition-colors text-center text-xs"
                style={{
                  background: `${nodeType.color}15`,
                  border: `1px solid ${nodeType.color}30`,
                  color: nodeType.color,
                }}
              >
                <div className="text-lg mb-1">{nodeType.icon}</div>
                {nodeType.label}
              </div>
            ))}
          </div>

          {nodes.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-white/10">
              <p className="text-xs font-medium text-white">Nodes ({nodes.length})</p>
              {nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  className="p-2 rounded-lg cursor-pointer text-xs transition-all"
                  style={{
                    background: selectedNode === node.id ? "oklch(0.65 0.22 270 / 0.2)" : "oklch(0.15 0.015 260)",
                    border: `1px solid ${selectedNode === node.id ? "oklch(0.65 0.22 270)" : "oklch(0.25 0.02 260)"}`,
                    color: "white",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{node.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                      className="p-0.5 hover:bg-white/10 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          className="flex-1 rounded-xl relative overflow-hidden"
          style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-white font-medium">Drag nodes to the canvas</p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 260)" }}>
                  Start with an event trigger, then add agents and conditions
                </p>
              </div>
            </div>
          ) : (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map((edge) => {
                const source = nodes.find((n) => n.id === edge.source);
                const target = nodes.find((n) => n.id === edge.target);
                if (!source || !target) return null;

                return (
                  <line
                    key={edge.id}
                    x1={source.x + 40}
                    y1={source.y + 40}
                    x2={target.x + 40}
                    y2={target.y + 40}
                    stroke="oklch(0.65 0.22 270)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          )}

          {nodes.map((node) => {
            const nodeType = NODE_TYPES.find((n) => n.type === node.type);
            return (
              <div
                key={node.id}
                draggable
                onDragStart={() => setSelectedNode(node.id)}
                onDrag={(e) => handleNodeDrag(node.id, e)}
                onClick={() => setSelectedNode(node.id)}
                className="absolute w-24 h-24 rounded-lg p-2 cursor-move transition-all hover:shadow-lg"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  background: `${nodeType?.color}15`,
                  border: `2px solid ${selectedNode === node.id ? nodeType?.color : `${nodeType?.color}50`}`,
                }}
              >
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-2xl">{nodeType?.icon}</div>
                  <p className="text-xs font-medium text-white mt-1 line-clamp-2">{node.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div
        className="rounded-xl p-3 text-xs"
        style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
      >
        <p style={{ color: "oklch(0.55 0.02 260)" }}>
          💡 Drag nodes onto the canvas. Click nodes to configure. Connect them by drawing edges to create your workflow logic.
        </p>
      </div>
    </div>
  );
}
