/**
 * Example Data Seeder - Populates database with demo data for testing
 * Creates sample companies, campaigns, actions, and workflows
 */

import {
  createAction,
  createEmailCampaign,
  updateActionStatus,
  addActionHistory,
} from "./actionPersistence";

export interface SeedOptions {
  tenantId: number;
  userId: number;
  verbose?: boolean;
}

/**
 * Sample company data for demo
 */
export const SAMPLE_COMPANIES = [
  {
    id: "comp_001",
    name: "TechVenture Inc",
    industry: "SaaS",
    email: "contact@techventure.com",
    website: "https://techventure.com",
    employees: 45,
    revenue: "$2.5M ARR",
    description: "AI-powered analytics platform for enterprises",
  },
  {
    id: "comp_002",
    name: "CloudScale Systems",
    industry: "Cloud Infrastructure",
    email: "hello@cloudscale.io",
    website: "https://cloudscale.io",
    employees: 120,
    revenue: "$8M ARR",
    description: "Serverless infrastructure and deployment platform",
  },
  {
    id: "comp_003",
    name: "DataFlow Analytics",
    industry: "Data Science",
    email: "info@dataflow.ai",
    website: "https://dataflow.ai",
    employees: 32,
    revenue: "$1.2M ARR",
    description: "Real-time data pipeline and analytics engine",
  },
  {
    id: "comp_004",
    name: "SecureVault Pro",
    industry: "Cybersecurity",
    email: "contact@securevault.pro",
    website: "https://securevault.pro",
    employees: 78,
    revenue: "$5.5M ARR",
    description: "Enterprise password and secrets management",
  },
  {
    id: "comp_005",
    name: "DevOps Automation",
    industry: "DevOps",
    email: "support@devopsauto.com",
    website: "https://devopsauto.com",
    employees: 56,
    revenue: "$3.8M ARR",
    description: "CI/CD and infrastructure automation platform",
  },
];

/**
 * Sample email recipients for campaigns
 */
export const SAMPLE_RECIPIENTS = [
  { email: "john.smith@techventure.com", name: "John Smith", title: "CTO" },
  { email: "sarah.jones@cloudscale.io", name: "Sarah Jones", title: "VP Engineering" },
  { email: "michael.chen@dataflow.ai", name: "Michael Chen", title: "Founder" },
  { email: "emma.wilson@securevault.pro", name: "Emma Wilson", title: "Head of Sales" },
  { email: "david.brown@devopsauto.com", name: "David Brown", title: "Engineering Manager" },
  { email: "lisa.anderson@techventure.com", name: "Lisa Anderson", title: "Product Manager" },
  { email: "james.taylor@cloudscale.io", name: "James Taylor", title: "DevOps Lead" },
  { email: "rachel.martinez@dataflow.ai", name: "Rachel Martinez", title: "Data Engineer" },
  { email: "robert.garcia@securevault.pro", name: "Robert Garcia", title: "Security Officer" },
  { email: "amanda.lee@devopsauto.com", name: "Amanda Lee", title: "Solutions Architect" },
];

/**
 * Sample email campaigns
 */
export const SAMPLE_CAMPAIGNS = [
  {
    name: "Q2 2026 Enterprise Outreach",
    templateId: "cold_outreach",
    description: "Initial outreach to enterprise prospects",
    recipients: SAMPLE_RECIPIENTS.slice(0, 5),
  },
  {
    name: "Follow-up: Product Demo",
    templateId: "followup_1",
    description: "First follow-up with product demo link",
    recipients: SAMPLE_RECIPIENTS.slice(2, 7),
  },
  {
    name: "Partnership Proposal",
    templateId: "proposal",
    description: "Formal partnership and integration proposal",
    recipients: SAMPLE_RECIPIENTS.slice(4, 8),
  },
  {
    name: "Weekly Tech Digest",
    templateId: "newsletter",
    description: "Weekly newsletter for subscribers",
    recipients: SAMPLE_RECIPIENTS.slice(0, 10),
  },
];

/**
 * Sample workflows
 */
export const SAMPLE_WORKFLOWS = [
  {
    id: "workflow_001",
    name: "Lead Scoring and Qualification",
    description: "Automatically score and qualify leads based on engagement",
    steps: [
      "Receive email open event",
      "Score lead based on engagement",
      "Create CRM contact if score > 50",
      "Trigger follow-up email if score > 75",
    ],
  },
  {
    id: "workflow_002",
    name: "Customer Onboarding",
    description: "Automated onboarding sequence for new customers",
    steps: [
      "Receive signup event",
      "Send welcome email",
      "Create task for account setup",
      "Schedule onboarding call",
      "Send resource guide",
    ],
  },
  {
    id: "workflow_003",
    name: "Deal Closure Automation",
    description: "Automate actions when deals close",
    steps: [
      "Monitor deal status change to closed-won",
      "Create invoice in accounting system",
      "Send contract to customer",
      "Create project in task manager",
      "Notify team in Slack",
    ],
  },
  {
    id: "workflow_004",
    name: "Churn Prevention",
    description: "Identify and prevent customer churn",
    steps: [
      "Monitor customer usage metrics",
      "Alert if usage drops > 30%",
      "Create support task",
      "Send re-engagement email",
      "Schedule check-in call",
    ],
  },
];

/**
 * Seed example data into database
 */
export async function seedExampleData(
  options: SeedOptions
): Promise<{ companies: number; campaigns: number; workflows: number }> {
  const { tenantId, userId, verbose = false } = options;

  try {
    if (verbose) console.log("[Seeder] Starting example data seeding...");

    let companiesCount = 0;
    let campaignsCount = 0;
    let workflowsCount = 0;

    // Seed sample companies (stored as trigger_workflow actions)
    for (const company of SAMPLE_COMPANIES) {
      if (verbose) console.log(`[Seeder] Creating company: ${company.name}`);

      const action = await createAction(
        tenantId,
        userId,
        "trigger_workflow",
        "medium",
        {
          workflowType: "company_profile",
          company: company,
        }
      );

      await addActionHistory(
        action.id,
        "pending",
        `Company profile created for ${company.name} (${company.industry})`
      );

      companiesCount++;
    }

    // Seed email campaigns
    for (const campaign of SAMPLE_CAMPAIGNS) {
      if (verbose) console.log(`[Seeder] Creating campaign: ${campaign.name}`);

      const createdCampaign = await createEmailCampaign(
        tenantId,
        userId,
        campaign.name,
        campaign.templateId,
        campaign.recipients
      );

      // Create corresponding action
      const action = await createAction(
        tenantId,
        userId,
        "send_email",
        "high",
        {
          campaignId: createdCampaign.id,
          campaignName: campaign.name,
          recipientCount: campaign.recipients.length,
          templateId: campaign.templateId,
        }
      );

      if (verbose) console.log(`[Seeder] Created action: ${action.id}`);

      // Add history entry
      await addActionHistory(
        action.id,
        "pending",
        `Campaign "${campaign.name}" created with ${campaign.recipients.length} recipients`
      );

      campaignsCount++;
    }

    // Seed sample workflows
    for (const workflow of SAMPLE_WORKFLOWS) {
      if (verbose) console.log(`[Seeder] Creating workflow: ${workflow.name}`);

      const action = await createAction(
        tenantId,
        userId,
        "trigger_workflow",
        "medium",
        {
          workflowId: workflow.id,
          workflowName: workflow.name,
          description: workflow.description,
          steps: workflow.steps,
        }
      );

      await addActionHistory(
        action.id,
        "pending",
        `Workflow "${workflow.name}" created with ${workflow.steps.length} steps`
      );

      workflowsCount++;
    }

    if (verbose) {
      console.log(`[Seeder] Example data seeding completed successfully`);
      console.log(
        `[Seeder] Created: ${companiesCount} companies, ${campaignsCount} campaigns, ${workflowsCount} workflows`
      );
    }

    return { companies: companiesCount, campaigns: campaignsCount, workflows: workflowsCount };
  } catch (error) {
    console.error("[Seeder] Error seeding data:", error);
    throw error;
  }
}

/**
 * Get sample data for UI display
 */
export function getSampleCompanies() {
  return SAMPLE_COMPANIES;
}

export function getSampleRecipients() {
  return SAMPLE_RECIPIENTS;
}

export function getSampleCampaigns() {
  return SAMPLE_CAMPAIGNS;
}

export function getSampleWorkflows() {
  return SAMPLE_WORKFLOWS;
}

/**
 * Create demo action execution sequence
 */
export async function createDemoActionSequence(
  tenantId: number,
  userId: number
): Promise<string[]> {
  const actionIds: string[] = [];

  // Create email send action
  const emailAction = await createAction(
    tenantId,
    userId,
    "send_email",
    "high",
    {
      recipients: SAMPLE_RECIPIENTS.slice(0, 3),
      templateId: "cold_outreach",
      subject: "Partnership Opportunity",
    }
  );
  actionIds.push(emailAction.id);

  // Update to executing
  await updateActionStatus(emailAction.id, "executing");
  await addActionHistory(emailAction.id, "executing", "Email sending started");

  // Simulate completion
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await updateActionStatus(emailAction.id, "completed", {
    sentCount: 3,
    failureCount: 0,
    messageIds: ["msg_001", "msg_002", "msg_003"],
  });
  await addActionHistory(emailAction.id, "completed", "All emails sent successfully");

  // Create CRM action
  const crmAction = await createAction(
    tenantId,
    userId,
    "update_crm",
    "medium",
    {
      operation: "create_contact",
      crmType: "hubspot",
      contacts: SAMPLE_RECIPIENTS.slice(0, 3),
    }
  );
  actionIds.push(crmAction.id);

  await updateActionStatus(crmAction.id, "executing");
  await addActionHistory(crmAction.id, "executing", "Creating CRM contacts");

  await new Promise((resolve) => setTimeout(resolve, 500));
  await updateActionStatus(crmAction.id, "completed", {
    createdCount: 3,
    contactIds: ["contact_001", "contact_002", "contact_003"],
  });
  await addActionHistory(crmAction.id, "completed", "CRM contacts created");

  // Create task action
  const taskAction = await createAction(
    tenantId,
    userId,
    "create_task",
    "medium",
    {
      title: "Follow up with prospects",
      description: "Follow up with 3 new prospects from email campaign",
      assignee: "sales@company.com",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    }
  );
  actionIds.push(taskAction.id);

  await updateActionStatus(taskAction.id, "executing");
  await addActionHistory(taskAction.id, "executing", "Creating task");

  await new Promise((resolve) => setTimeout(resolve, 300));
  await updateActionStatus(taskAction.id, "completed", {
    taskId: "task_001",
    assignedTo: "sales@company.com",
  });
  await addActionHistory(taskAction.id, "completed", "Task created and assigned");

  return actionIds;
}

/**
 * Reset example data (for testing)
 */
export async function resetExampleData(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Reset only allowed in development environment");
  }
  console.log("[Seeder] Reset functionality would be implemented here");
}
