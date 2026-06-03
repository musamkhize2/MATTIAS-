/**
 * Voice Command Execution Engine
 * Maps transcribed voice commands to tRPC mutations and executes them
 */

export interface VoiceCommand {
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

export interface CommandExecutionResult {
  success: boolean;
  action: string;
  result?: any;
  error?: string;
  executedAt: string;
}

/**
 * Parse voice command text into structured command object
 */
export function parseVoiceCommand(text: string): VoiceCommand | null {
  const lowerText = text.toLowerCase().trim();

  // Campaign commands
  if (lowerText.includes("create campaign")) {
    const nameMatch = text.match(/(?:named|called|for)\s+([^,\.]+)/i);
    return {
      action: "createCampaign",
      parameters: {
        name: nameMatch ? nameMatch[1].trim() : "Voice Created Campaign",
        description: `Created via voice command: ${text}`,
      },
      confidence: 0.95,
    };
  }

  if (lowerText.includes("send campaign") || lowerText.includes("send email")) {
    const idMatch = text.match(/campaign\s+(?:id\s+)?(\d+)/i);
    return {
      action: "sendCampaign",
      parameters: {
        campaignId: idMatch ? parseInt(idMatch[1]) : null,
      },
      confidence: 0.9,
    };
  }

  if (lowerText.includes("list campaigns")) {
    return {
      action: "listCampaigns",
      parameters: {
        limit: 50,
      },
      confidence: 0.95,
    };
  }

  // Analytics commands
  if (lowerText.includes("get analytics") || lowerText.includes("show analytics")) {
    const timeMatch = text.match(/(?:for|last)\s+(\d+)\s+(days?|weeks?|months?)/i);
    const timeValue = timeMatch ? parseInt(timeMatch[1]) : 7;
    const timeUnit = timeMatch ? timeMatch[2].toLowerCase() : "days";

    return {
      action: "getAnalytics",
      parameters: {
        timeRange: `${timeValue}${timeUnit[0]}`,
      },
      confidence: 0.9,
    };
  }

  if (lowerText.includes("campaign performance") || lowerText.includes("performance metrics")) {
    return {
      action: "getCampaignPerformance",
      parameters: {
        limit: 10,
      },
      confidence: 0.9,
    };
  }

  // Company commands
  if (lowerText.includes("list companies") || lowerText.includes("show companies")) {
    return {
      action: "listCompanies",
      parameters: {
        limit: 50,
      },
      confidence: 0.95,
    };
  }

  if (lowerText.includes("create company")) {
    const nameMatch = text.match(/(?:named|called|for)\s+([^,\.]+)/i);
    return {
      action: "createCompany",
      parameters: {
        name: nameMatch ? nameMatch[1].trim() : "Voice Created Company",
        description: `Created via voice command: ${text}`,
      },
      confidence: 0.9,
    };
  }

  // Approval commands
  if (lowerText.includes("list approvals") || lowerText.includes("show approvals")) {
    return {
      action: "listApprovals",
      parameters: {
        limit: 50,
      },
      confidence: 0.95,
    };
  }

  if (lowerText.includes("approve") && lowerText.includes("request")) {
    const idMatch = text.match(/(?:request|approval)\s+(?:id\s+)?(\d+)/i);
    return {
      action: "approveRequest",
      parameters: {
        approvalId: idMatch ? parseInt(idMatch[1]) : null,
      },
      confidence: 0.85,
    };
  }

  if (lowerText.includes("reject") && lowerText.includes("request")) {
    const idMatch = text.match(/(?:request|approval)\s+(?:id\s+)?(\d+)/i);
    return {
      action: "rejectRequest",
      parameters: {
        approvalId: idMatch ? parseInt(idMatch[1]) : null,
      },
      confidence: 0.85,
    };
  }

  // Dashboard commands
  if (lowerText.includes("show dashboard") || lowerText.includes("open dashboard")) {
    return {
      action: "navigateDashboard",
      parameters: {
        section: "overview",
      },
      confidence: 0.95,
    };
  }

  if (lowerText.includes("show agents") || lowerText.includes("list agents")) {
    return {
      action: "navigateDashboard",
      parameters: {
        section: "agents",
      },
      confidence: 0.95,
    };
  }

  // Help commands
  if (lowerText.includes("help") || lowerText.includes("what can i do")) {
    return {
      action: "showHelp",
      parameters: {},
      confidence: 0.95,
    };
  }

  // No recognized command
  return null;
}

/**
 * Get available voice commands for UI display
 */
export function getAvailableCommands() {
  return [
    {
      category: "Campaigns",
      commands: [
        "Create campaign",
        "Send campaign",
        "List campaigns",
        "Campaign performance",
      ],
    },
    {
      category: "Analytics",
      commands: [
        "Get analytics",
        "Show performance metrics",
      ],
    },
    {
      category: "Companies",
      commands: [
        "List companies",
        "Create company",
      ],
    },
    {
      category: "Approvals",
      commands: [
        "List approvals",
        "Approve request",
        "Reject request",
      ],
    },
    {
      category: "Navigation",
      commands: [
        "Show dashboard",
        "Show agents",
      ],
    },
  ];
}

/**
 * Validate command parameters before execution
 */
export function validateCommandParameters(command: VoiceCommand): { valid: boolean; error?: string } {
  switch (command.action) {
    case "sendCampaign":
      if (!command.parameters.campaignId) {
        return { valid: false, error: "Campaign ID is required to send campaign" };
      }
      break;

    case "approveRequest":
    case "rejectRequest":
      if (!command.parameters.approvalId) {
        return { valid: false, error: "Approval ID is required" };
      }
      break;

    case "createCampaign":
    case "createCompany":
      if (!command.parameters.name) {
        return { valid: false, error: "Name is required" };
      }
      break;
  }

  return { valid: true };
}

/**
 * Get command execution instructions for the UI
 */
export function getCommandInstructions(command: VoiceCommand): string {
  const instructions: Record<string, string> = {
    createCampaign: "Creating new email campaign...",
    sendCampaign: "Sending email campaign...",
    listCampaigns: "Fetching campaigns...",
    getAnalytics: "Loading analytics data...",
    getCampaignPerformance: "Analyzing campaign performance...",
    listCompanies: "Fetching companies...",
    createCompany: "Creating new company...",
    listApprovals: "Fetching approval requests...",
    approveRequest: "Approving request...",
    rejectRequest: "Rejecting request...",
    navigateDashboard: "Navigating to dashboard...",
    showHelp: "Loading help information...",
  };

  return instructions[command.action] || "Executing command...";
}

/**
 * Map voice command to tRPC procedure path
 */
export function mapCommandToTRPCPath(command: VoiceCommand): string | null {
  const pathMap: Record<string, string | null> = {
    createCampaign: "emailCampaigns.create",
    sendCampaign: "emailCampaigns.send",
    listCampaigns: "emailCampaigns.list",
    getAnalytics: "analytics.getCampaignMetrics",
    getCampaignPerformance: "analytics.getPerformanceComparison",
    listCompanies: "companies.list",
    createCompany: "companies.create",
    listApprovals: "approvals.list",
    approveRequest: "approvals.approve",
    rejectRequest: "approvals.reject",
    navigateDashboard: null, // Client-side navigation
    showHelp: null, // Client-side help
  };

  return pathMap[command.action] || null;
}

/**
 * Format command result for UI display
 */
export function formatCommandResult(command: VoiceCommand, result: any): string {
  switch (command.action) {
    case "createCampaign":
      return `Campaign "${result.name}" created successfully.`;

    case "sendCampaign":
      return `Campaign sent to ${result.recipientCount || 0} recipients.`;

    case "listCampaigns":
      return `Found ${result.campaigns?.length || 0} campaigns.`;

    case "getAnalytics":
      return `Analytics: ${result.totalSent || 0} sent, ${result.opened || 0} opened, ${result.clicked || 0} clicked.`;

    case "getCampaignPerformance":
      return `Top campaign: ${result.topCampaign?.name || "N/A"} with ${result.topCampaign?.openRate || 0}% open rate.`;

    case "listCompanies":
      return `Found ${result.companies?.length || 0} companies.`;

    case "createCompany":
      return `Company "${result.name}" created successfully.`;

    case "listApprovals":
      return `Found ${result.approvals?.length || 0} pending approvals.`;

    case "approveRequest":
      return "Request approved successfully.";

    case "rejectRequest":
      return "Request rejected successfully.";

    default:
      return "Command executed successfully.";
  }
}
