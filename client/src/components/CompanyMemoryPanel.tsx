import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit,
  Tag,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  Brain,
  TrendingUp,
  Users,
  MessageSquare,
  Zap,
  Target,
} from "lucide-react";
import { format } from "date-fns";

export interface CompanyMemory {
  id: string;
  companyId: string;
  memoryType: "interaction_history" | "performance_notes" | "campaign_insights" | "customer_feedback" | "market_analysis" | "strategic_goals" | "custom_note";
  title: string;
  content: string;
  tags?: string[];
  importance?: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyMemoryPanelProps {
  companyId: string;
  memories: CompanyMemory[];
  onAddMemory: (memory: Omit<CompanyMemory, "id" | "companyId" | "createdAt" | "updatedAt">) => void;
  onDeleteMemory: (memoryId: string) => void;
  onUpdateMemory: (memoryId: string, memory: Partial<CompanyMemory>) => void;
}

const memoryTypeConfig = {
  interaction_history: {
    icon: MessageSquare,
    label: "Interaction History",
    color: "oklch(0.72 0.18 200)",
  },
  performance_notes: {
    icon: TrendingUp,
    label: "Performance Notes",
    color: "oklch(0.68 0.2 145)",
  },
  campaign_insights: {
    icon: Zap,
    label: "Campaign Insights",
    color: "oklch(0.75 0.18 75)",
  },
  customer_feedback: {
    icon: Users,
    label: "Customer Feedback",
    color: "oklch(0.65 0.22 270)",
  },
  market_analysis: {
    icon: TrendingUp,
    label: "Market Analysis",
    color: "oklch(0.62 0.22 300)",
  },
  strategic_goals: {
    icon: Target,
    label: "Strategic Goals",
    color: "oklch(0.7 0.2 170)",
  },
  custom_note: {
    icon: Brain,
    label: "Custom Note",
    color: "oklch(0.6 0.22 25)",
  },
};

const importanceConfig = {
  low: { color: "bg-blue-900 text-blue-100", label: "Low" },
  medium: { color: "bg-yellow-900 text-yellow-100", label: "Medium" },
  high: { color: "bg-red-900 text-red-100", label: "High" },
};

export function CompanyMemoryPanel({
  companyId,
  memories,
  onAddMemory,
  onDeleteMemory,
  onUpdateMemory,
}: CompanyMemoryPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<CompanyMemory | null>(null);
  const [formData, setFormData] = useState<{
    memoryType: "interaction_history" | "performance_notes" | "campaign_insights" | "customer_feedback" | "market_analysis" | "strategic_goals" | "custom_note";
    title: string;
    content: string;
    tags: string;
    importance: "low" | "medium" | "high";
  }>({
    memoryType: "custom_note",
    title: "",
    content: "",
    tags: "",
    importance: "medium",
  });

  const handleAddMemory = () => {
    setEditingMemory(null);
    setFormData({
      memoryType: "custom_note" as const,
      title: "",
      content: "",
      tags: "",
      importance: "medium" as const,
    });
    setIsDialogOpen(true);
  };

  const handleEditMemory = (memory: CompanyMemory) => {
    setEditingMemory(memory);
    setFormData({
      memoryType: memory.memoryType,
      title: memory.title,
      content: memory.content,
      tags: memory.tags?.join(", ") || "",
      importance: memory.importance || "medium",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Title and content are required");
      return;
    }

    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingMemory) {
      onUpdateMemory(editingMemory.id, {
        title: formData.title,
        content: formData.content,
        tags,
        importance: formData.importance,
      });
    } else {
      onAddMemory({
        memoryType: formData.memoryType,
        title: formData.title,
        content: formData.content,
        tags,
        importance: formData.importance,
      });
    }

    setIsDialogOpen(false);
  };

  const groupedMemories = memories.reduce(
    (acc, memory) => {
      if (!acc[memory.memoryType]) {
        acc[memory.memoryType] = [];
      }
      acc[memory.memoryType].push(memory);
      return acc;
    },
    {} as Record<string, CompanyMemory[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Company Memory System</h2>
          <p className="text-muted-foreground mt-1">
            Track interactions, insights, and strategic information
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={handleAddMemory}>
              <Plus className="w-4 h-4" />
              Add Memory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMemory ? "Edit Memory" : "Add New Memory"}
              </DialogTitle>
              <DialogDescription>
                Save important information about this company
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Memory Type</label>
                <select
                  value={formData.memoryType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      memoryType: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  {Object.entries(memoryTypeConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Memory title"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Content *</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Detailed information"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Importance</label>
                  <select
                    value={formData.importance}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        importance: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Tags</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tags: e.target.value }))
                    }
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingMemory ? "Update" : "Save"} Memory
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Memory Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Memories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memories.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memories.filter((m) => m.importance === "high").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Memory Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(groupedMemories).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {memories.length > 0
                ? format(new Date(memories[0].updatedAt), "MMM d")
                : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memories by Type */}
      {Object.entries(groupedMemories).length > 0 ? (
        Object.entries(groupedMemories).map(([type, typeMemories]) => {
          const config = memoryTypeConfig[type as keyof typeof memoryTypeConfig];
          const Icon = config.icon;

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5" style={{ color: config.color }} />
                <h3 className="font-semibold">{config.label}</h3>
                <Badge variant="secondary">{typeMemories.length}</Badge>
              </div>

              <div className="space-y-2">
                {typeMemories.map((memory) => (
                  <Card key={memory.id} className="hover:border-blue-500/50 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{memory.title}</h4>
                            {memory.importance && (
                              <Badge className={importanceConfig[memory.importance].color}>
                                {importanceConfig[memory.importance].label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {memory.content}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {memory.tags && memory.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {memory.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {format(new Date(memory.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditMemory(memory)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => onDeleteMemory(memory.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Memories Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start building company memory by adding interactions, insights, and notes
            </p>
            <Button onClick={handleAddMemory} className="gap-2">
              <Plus className="w-4 h-4" />
              Add First Memory
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
