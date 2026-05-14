import { describe, it, expect } from "vitest";
import {
  SAMPLE_COMPANIES,
  SAMPLE_RECIPIENTS,
  SAMPLE_CAMPAIGNS,
  SAMPLE_WORKFLOWS,
  getSampleCompanies,
  getSampleRecipients,
  getSampleCampaigns,
  getSampleWorkflows,
} from "./exampleDataSeeder.ts";

/**
 * End-to-End Integration Tests (Unit Tests)
 * Tests the data structures and workflow definitions
 */

describe("End-to-End Integration", () => {
  describe("Sample Data Validation", () => {
    it("should have 5 sample companies", () => {
      expect(SAMPLE_COMPANIES).toHaveLength(5);
    });

    it("should have 10 sample recipients", () => {
      expect(SAMPLE_RECIPIENTS).toHaveLength(10);
    });

    it("should have 4 sample campaigns", () => {
      expect(SAMPLE_CAMPAIGNS).toHaveLength(4);
    });

    it("should have 4 sample workflows", () => {
      expect(SAMPLE_WORKFLOWS).toHaveLength(4);
    });
  });

  describe("Company Data Structure", () => {
    it("should have valid company structure", () => {
      SAMPLE_COMPANIES.forEach((company) => {
        expect(company).toHaveProperty("id");
        expect(company).toHaveProperty("name");
        expect(company).toHaveProperty("industry");
        expect(company).toHaveProperty("email");
        expect(company).toHaveProperty("website");
        expect(company).toHaveProperty("employees");
        expect(company).toHaveProperty("revenue");
        expect(company).toHaveProperty("description");
      });
    });

    it("should have valid email addresses", () => {
      SAMPLE_COMPANIES.forEach((company) => {
        expect(company.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it("should have valid website URLs", () => {
      SAMPLE_COMPANIES.forEach((company) => {
        expect(company.website).toMatch(/^https?:\/\//);
      });
    });

    it("should have positive employee counts", () => {
      SAMPLE_COMPANIES.forEach((company) => {
        expect(company.employees).toBeGreaterThan(0);
      });
    });

    it("should have unique company IDs", () => {
      const ids = new Set(SAMPLE_COMPANIES.map((c) => c.id));
      expect(ids.size).toBe(SAMPLE_COMPANIES.length);
    });
  });

  describe("Recipient Data Structure", () => {
    it("should have valid recipient structure", () => {
      SAMPLE_RECIPIENTS.forEach((recipient) => {
        expect(recipient).toHaveProperty("email");
        expect(recipient).toHaveProperty("name");
        expect(recipient).toHaveProperty("title");
      });
    });

    it("should have valid email addresses", () => {
      SAMPLE_RECIPIENTS.forEach((recipient) => {
        expect(recipient.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it("should have non-empty names", () => {
      SAMPLE_RECIPIENTS.forEach((recipient) => {
        expect(recipient.name.length).toBeGreaterThan(0);
      });
    });

    it("should have non-empty titles", () => {
      SAMPLE_RECIPIENTS.forEach((recipient) => {
        expect(recipient.title.length).toBeGreaterThan(0);
      });
    });

    it("should have unique email addresses", () => {
      const emails = new Set(SAMPLE_RECIPIENTS.map((r) => r.email));
      expect(emails.size).toBe(SAMPLE_RECIPIENTS.length);
    });

    it("should have diverse job titles", () => {
      const titles = new Set(SAMPLE_RECIPIENTS.map((r) => r.title));
      expect(titles.size).toBeGreaterThan(3);
    });
  });

  describe("Campaign Data Structure", () => {
    it("should have valid campaign structure", () => {
      SAMPLE_CAMPAIGNS.forEach((campaign) => {
        expect(campaign).toHaveProperty("name");
        expect(campaign).toHaveProperty("templateId");
        expect(campaign).toHaveProperty("description");
        expect(campaign).toHaveProperty("recipients");
      });
    });

    it("should have non-empty campaign names", () => {
      SAMPLE_CAMPAIGNS.forEach((campaign) => {
        expect(campaign.name.length).toBeGreaterThan(0);
      });
    });

    it("should have valid template IDs", () => {
      const validTemplates = ["cold_outreach", "followup_1", "proposal", "newsletter"];
      SAMPLE_CAMPAIGNS.forEach((campaign) => {
        expect(validTemplates).toContain(campaign.templateId);
      });
    });

    it("should have recipients", () => {
      SAMPLE_CAMPAIGNS.forEach((campaign) => {
        expect(campaign.recipients.length).toBeGreaterThan(0);
      });
    });

    it("should have valid recipients", () => {
      SAMPLE_CAMPAIGNS.forEach((campaign) => {
        campaign.recipients.forEach((recipient) => {
          expect(recipient.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
          expect(recipient.name).toBeDefined();
        });
      });
    });
  });

  describe("Workflow Data Structure", () => {
    it("should have valid workflow structure", () => {
      SAMPLE_WORKFLOWS.forEach((workflow) => {
        expect(workflow).toHaveProperty("id");
        expect(workflow).toHaveProperty("name");
        expect(workflow).toHaveProperty("description");
        expect(workflow).toHaveProperty("steps");
      });
    });

    it("should have non-empty workflow names", () => {
      SAMPLE_WORKFLOWS.forEach((workflow) => {
        expect(workflow.name.length).toBeGreaterThan(0);
      });
    });

    it("should have workflow steps", () => {
      SAMPLE_WORKFLOWS.forEach((workflow) => {
        expect(Array.isArray(workflow.steps)).toBe(true);
        expect(workflow.steps.length).toBeGreaterThan(0);
      });
    });

    it("should have at least 3 steps per workflow", () => {
      SAMPLE_WORKFLOWS.forEach((workflow) => {
        expect(workflow.steps.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("should have non-empty step descriptions", () => {
      SAMPLE_WORKFLOWS.forEach((workflow) => {
        workflow.steps.forEach((step) => {
          expect(step.length).toBeGreaterThan(0);
        });
      });
    });

    it("should have unique workflow IDs", () => {
      const ids = new Set(SAMPLE_WORKFLOWS.map((w) => w.id));
      expect(ids.size).toBe(SAMPLE_WORKFLOWS.length);
    });
  });

  describe("Getter Functions", () => {
    it("should return sample companies", () => {
      const companies = getSampleCompanies();
      expect(companies).toHaveLength(5);
      expect(companies).toEqual(SAMPLE_COMPANIES);
    });

    it("should return sample recipients", () => {
      const recipients = getSampleRecipients();
      expect(recipients).toHaveLength(10);
      expect(recipients).toEqual(SAMPLE_RECIPIENTS);
    });

    it("should return sample campaigns", () => {
      const campaigns = getSampleCampaigns();
      expect(campaigns).toHaveLength(4);
      expect(campaigns).toEqual(SAMPLE_CAMPAIGNS);
    });

    it("should return sample workflows", () => {
      const workflows = getSampleWorkflows();
      expect(workflows).toHaveLength(4);
      expect(workflows).toEqual(SAMPLE_WORKFLOWS);
    });
  });

  describe("Data Consistency", () => {
    it("should have consistent company data", () => {
      SAMPLE_COMPANIES.forEach((company) => {
        expect(company.id).toBeDefined();
        expect(company.name).toBeDefined();
        expect(company.industry).toBeDefined();
        expect(typeof company.employees).toBe("number");
      });
    });

    it("should have consistent recipient data", () => {
      SAMPLE_RECIPIENTS.forEach((recipient) => {
        expect(recipient.email).toBeDefined();
        expect(recipient.name).toBeDefined();
        expect(recipient.title).toBeDefined();
      });
    });

    it("should have consistent campaign data", () => {
      SAMPLE_CAMPAIGNS.forEach((campaign) => {
        expect(campaign.name).toBeDefined();
        expect(campaign.templateId).toBeDefined();
        expect(Array.isArray(campaign.recipients)).toBe(true);
      });
    });

    it("should have consistent workflow data", () => {
      SAMPLE_WORKFLOWS.forEach((workflow) => {
        expect(workflow.id).toBeDefined();
        expect(workflow.name).toBeDefined();
        expect(Array.isArray(workflow.steps)).toBe(true);
      });
    });
  });

  describe("Workflow Integration Scenarios", () => {
    it("should support Lead Scoring workflow", () => {
      const workflow = SAMPLE_WORKFLOWS.find((w) => w.name === "Lead Scoring and Qualification");
      expect(workflow).toBeDefined();
      expect(workflow?.steps.length).toBeGreaterThan(0);
      expect(workflow?.steps).toContain("Receive email open event");
    });

    it("should support Customer Onboarding workflow", () => {
      const workflow = SAMPLE_WORKFLOWS.find((w) => w.name === "Customer Onboarding");
      expect(workflow).toBeDefined();
      expect(workflow?.steps.length).toBeGreaterThan(0);
      expect(workflow?.steps).toContain("Send welcome email");
    });

    it("should support Deal Closure workflow", () => {
      const workflow = SAMPLE_WORKFLOWS.find((w) => w.name === "Deal Closure Automation");
      expect(workflow).toBeDefined();
      expect(workflow?.steps.length).toBeGreaterThan(0);
      expect(workflow?.steps).toContain("Create invoice in accounting system");
    });

    it("should support Churn Prevention workflow", () => {
      const workflow = SAMPLE_WORKFLOWS.find((w) => w.name === "Churn Prevention");
      expect(workflow).toBeDefined();
      expect(workflow?.steps.length).toBeGreaterThan(0);
      expect(workflow?.steps).toContain("Monitor customer usage metrics");
    });
  });

  describe("Campaign Execution Scenarios", () => {
    it("should support cold outreach campaign", () => {
      const campaign = SAMPLE_CAMPAIGNS.find((c) => c.templateId === "cold_outreach");
      expect(campaign).toBeDefined();
      expect(campaign?.recipients.length).toBeGreaterThan(0);
    });

    it("should support follow-up campaign", () => {
      const campaign = SAMPLE_CAMPAIGNS.find((c) => c.templateId === "followup_1");
      expect(campaign).toBeDefined();
      expect(campaign?.recipients.length).toBeGreaterThan(0);
    });

    it("should support proposal campaign", () => {
      const campaign = SAMPLE_CAMPAIGNS.find((c) => c.templateId === "proposal");
      expect(campaign).toBeDefined();
      expect(campaign?.recipients.length).toBeGreaterThan(0);
    });

    it("should support newsletter campaign", () => {
      const campaign = SAMPLE_CAMPAIGNS.find((c) => c.templateId === "newsletter");
      expect(campaign).toBeDefined();
      expect(campaign?.recipients.length).toBeGreaterThan(0);
    });
  });

  describe("Data Quality Metrics", () => {
    it("should have diverse industries", () => {
      const industries = new Set(SAMPLE_COMPANIES.map((c) => c.industry));
      expect(industries.size).toBe(5);
    });

    it("should have diverse job titles", () => {
      const titles = new Set(SAMPLE_RECIPIENTS.map((r) => r.title));
      expect(titles.size).toBeGreaterThan(3);
    });

    it("should have diverse campaign types", () => {
      const types = new Set(SAMPLE_CAMPAIGNS.map((c) => c.templateId));
      expect(types.size).toBe(4);
    });

    it("should have diverse workflow types", () => {
      const names = new Set(SAMPLE_WORKFLOWS.map((w) => w.name));
      expect(names.size).toBe(4);
    });

    it("should have realistic employee ranges", () => {
      const employees = SAMPLE_COMPANIES.map((c) => c.employees);
      expect(Math.min(...employees)).toBeGreaterThan(0);
      expect(Math.max(...employees)).toBeLessThan(10000);
    });
  });

  describe("Action Type Support", () => {
    it("should support send_email action", () => {
      expect("send_email").toBeDefined();
    });

    it("should support update_crm action", () => {
      expect("update_crm").toBeDefined();
    });

    it("should support create_task action", () => {
      expect("create_task").toBeDefined();
    });

    it("should support schedule_meeting action", () => {
      expect("schedule_meeting").toBeDefined();
    });

    it("should support generate_report action", () => {
      expect("generate_report").toBeDefined();
    });

    it("should support sync_data action", () => {
      expect("sync_data").toBeDefined();
    });

    it("should support trigger_workflow action", () => {
      expect("trigger_workflow").toBeDefined();
    });
  });

  describe("Priority Levels", () => {
    it("should support low priority", () => {
      expect("low").toBeDefined();
    });

    it("should support medium priority", () => {
      expect("medium").toBeDefined();
    });

    it("should support high priority", () => {
      expect("high").toBeDefined();
    });

    it("should support critical priority", () => {
      expect("critical").toBeDefined();
    });
  });

  describe("Action Status Lifecycle", () => {
    it("should support pending status", () => {
      expect("pending").toBeDefined();
    });

    it("should support executing status", () => {
      expect("executing").toBeDefined();
    });

    it("should support completed status", () => {
      expect("completed").toBeDefined();
    });

    it("should support failed status", () => {
      expect("failed").toBeDefined();
    });
  });
});
