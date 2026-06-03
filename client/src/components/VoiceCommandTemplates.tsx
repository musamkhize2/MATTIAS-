import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Send } from "lucide-react";

interface VoiceCommandTemplate {
  id: string;
  label: string;
  command: string;
  description: string;
  category: "campaign" | "email" | "analytics" | "company" | "approval";
}

const VOICE_COMMAND_TEMPLATES: VoiceCommandTemplate[] = [
  {
    id: "create-campaign",
    label: "Create Campaign",
    command: "Create a new email campaign",
    description: "Start a new campaign from scratch",
    category: "campaign",
  },
  {
    id: "send-campaign",
    label: "Send Campaign",
    command: "Send the campaign to all subscribers",
    description: "Execute and send active campaign",
    category: "campaign",
  },
  {
    id: "get-analytics",
    label: "Get Analytics",
    command: "Show me campaign analytics",
    description: "Display campaign performance metrics",
    category: "analytics",
  },
  {
    id: "list-companies",
    label: "List Companies",
    command: "Show all companies",
    description: "Display all tracked companies",
    category: "company",
  },
  {
    id: "create-company",
    label: "Create Company",
    command: "Add a new company",
    description: "Create and track a new company",
    category: "company",
  },
  {
    id: "send-email",
    label: "Send Email",
    command: "Send an email campaign",
    description: "Send email to recipients",
    category: "email",
  },
  {
    id: "approve-action",
    label: "Approve Action",
    command: "Approve the pending action",
    description: "Approve queued approval request",
    category: "approval",
  },
  {
    id: "reject-action",
    label: "Reject Action",
    command: "Reject the pending action",
    description: "Reject queued approval request",
    category: "approval",
  },
];

interface VoiceCommandTemplatesProps {
  onCommandSelect: (command: string) => void;
  isListening?: boolean;
}

/**
 * VoiceCommandTemplates Component
 * Displays pre-configured voice command templates to help users discover available commands
 */
export const VoiceCommandTemplates: React.FC<VoiceCommandTemplatesProps> = ({
  onCommandSelect,
  isListening = false,
}) => {
  const categories = Array.from(
    new Set(VOICE_COMMAND_TEMPLATES.map((t) => t.category))
  );

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Voice Command Templates
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Click a template or say it aloud to execute
        </p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-amber-400 uppercase mb-2 tracking-wide">
            {category.replace("_", " ")}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {VOICE_COMMAND_TEMPLATES.filter((t) => t.category === category).map(
              (template) => (
                <Button
                  key={template.id}
                  onClick={() => onCommandSelect(template.command)}
                  disabled={isListening}
                  variant="outline"
                  className="h-auto py-2 px-3 flex flex-col items-start justify-start text-left hover:bg-amber-500/10 hover:border-amber-500/50"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Mic className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-white truncate">
                      {template.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {template.description}
                  </span>
                </Button>
              )
            )}
          </div>
        </div>
      ))}

      {/* Quick Actions */}
      <div className="pt-2 border-t border-slate-700">
        <h4 className="text-xs font-semibold text-amber-400 uppercase mb-2 tracking-wide">
          Quick Actions
        </h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs"
            onClick={() => onCommandSelect("Show dashboard")}
          >
            Dashboard
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="text-xs"
            onClick={() => onCommandSelect("Get status")}
          >
            Status
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="text-xs"
            onClick={() => onCommandSelect("Help")}
          >
            Help
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandTemplates;
