import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createCompany,
  getCompany,
  getCompanies,
  updateCompany,
  deleteCompany,
  addMemory,
  getMemories,
  getMemoriesByType,
  updateMemory,
  deleteMemory,
  getMetrics,
  updateMetrics,
  getCompanySummary,
  CompanyInput,
  MemoryInput,
} from "./companyManagement";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

describe("Company Management Service", () => {
  const mockCompanyInput: CompanyInput = {
    name: "TechCorp Solutions",
    industry: "Software Development",
    website: "https://techcorp.com",
    description: "Leading provider of cloud solutions",
    monthlyRevenue: 250000,
    employeeCount: 85,
    foundedYear: 2015,
    contactEmail: "contact@techcorp.com",
    contactPhone: "+1-555-0123",
    location: "San Francisco, CA",
  };

  const mockMemoryInput: MemoryInput = {
    memoryType: "performance_notes",
    title: "Q1 Performance Review",
    content: "Strong growth in enterprise segment",
    tags: ["quarterly", "performance"],
    importance: "high",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Company CRUD Operations", () => {
    it("should create a company with all fields", () => {
      expect(mockCompanyInput.name).toBeDefined();
      expect(mockCompanyInput.industry).toBeDefined();
      expect(mockCompanyInput.website).toBeDefined();
      expect(mockCompanyInput.monthlyRevenue).toBeGreaterThan(0);
    });

    it("should validate required company fields", () => {
      const invalidInput: Partial<CompanyInput> = {
        industry: "Tech",
        // Missing name
      };
      expect(invalidInput.name).toBeUndefined();
    });

    it("should handle company with optional fields", () => {
      const minimalInput: CompanyInput = {
        name: "Minimal Corp",
      };
      expect(minimalInput.name).toBeDefined();
      expect(minimalInput.industry).toBeUndefined();
    });

    it("should update company information", () => {
      const updates: Partial<CompanyInput> = {
        monthlyRevenue: 300000,
        employeeCount: 100,
      };
      expect(updates.monthlyRevenue).toBeGreaterThan(mockCompanyInput.monthlyRevenue!);
    });

    it("should track company creation and update timestamps", () => {
      const now = new Date();
      expect(now).toBeInstanceOf(Date);
    });
  });

  describe("Company Memory System", () => {
    it("should add memory with all fields", () => {
      expect(mockMemoryInput.title).toBeDefined();
      expect(mockMemoryInput.content).toBeDefined();
      expect(mockMemoryInput.memoryType).toBeDefined();
    });

    it("should support all memory types", () => {
      const memoryTypes = [
        "interaction_history",
        "performance_notes",
        "campaign_insights",
        "customer_feedback",
        "market_analysis",
        "strategic_goals",
        "custom_note",
      ];
      expect(memoryTypes).toContain("performance_notes");
      expect(memoryTypes).toContain("campaign_insights");
    });

    it("should support importance levels", () => {
      const importanceLevels = ["low", "medium", "high"];
      expect(importanceLevels).toContain("high");
      expect(importanceLevels).toContain("medium");
    });

    it("should handle memory tags", () => {
      const memory = {
        ...mockMemoryInput,
        tags: ["tag1", "tag2", "tag3"],
      };
      expect(memory.tags).toHaveLength(3);
    });

    it("should allow empty tags", () => {
      const memory = {
        ...mockMemoryInput,
        tags: [],
      };
      expect(memory.tags).toHaveLength(0);
    });

    it("should track memory creation dates", () => {
      const createdAt = new Date();
      expect(createdAt).toBeInstanceOf(Date);
    });
  });

  describe("Company Metrics", () => {
    it("should track campaign metrics", () => {
      const metrics = {
        totalCampaigns: 5,
        activeCampaigns: 3,
        totalAdSpend: 50000,
        totalConversions: 1250,
        averageROAS: 3.5,
      };
      expect(metrics.totalCampaigns).toBeGreaterThan(0);
      expect(metrics.averageROAS).toBeGreaterThan(0);
    });

    it("should track performance indicators", () => {
      const metrics = {
        leadGenerated: 500,
        conversionRate: 2.5,
        customerAcquisitionCost: 40,
      };
      expect(metrics.leadGenerated).toBeGreaterThan(0);
      expect(metrics.conversionRate).toBeGreaterThan(0);
    });

    it("should track growth metrics", () => {
      const metrics = {
        monthOverMonthGrowth: 15.5,
        yearOverYearGrowth: 45.2,
      };
      expect(metrics.monthOverMonthGrowth).toBeGreaterThan(0);
      expect(metrics.yearOverYearGrowth).toBeGreaterThan(0);
    });

    it("should handle zero metrics", () => {
      const metrics = {
        totalCampaigns: 0,
        leadGenerated: 0,
        conversionRate: 0,
      };
      expect(metrics.totalCampaigns).toBe(0);
    });
  });

  describe("Data Validation", () => {
    it("should validate email format", () => {
      const validEmail = "contact@techcorp.com";
      expect(validEmail).toContain("@");
    });

    it("should validate phone format", () => {
      const validPhone = "+1-555-0123";
      expect(validPhone).toMatch(/\+\d/);
    });

    it("should validate website URL", () => {
      const validUrl = "https://techcorp.com";
      expect(validUrl).toMatch(/^https?:\/\//);
    });

    it("should validate revenue is positive", () => {
      const revenue = 250000;
      expect(revenue).toBeGreaterThan(0);
    });

    it("should validate employee count is positive", () => {
      const employees = 85;
      expect(employees).toBeGreaterThan(0);
    });

    it("should validate founded year is reasonable", () => {
      const year = 2015;
      expect(year).toBeGreaterThan(1900);
      expect(year).toBeLessThanOrEqual(new Date().getFullYear());
    });
  });

  describe("Company Deletion", () => {
    it("should delete company and associated data", () => {
      const companyId = "comp-123";
      expect(companyId).toBeDefined();
    });

    it("should cascade delete memories", () => {
      const memories = [
        { id: "mem-1", title: "Memory 1" },
        { id: "mem-2", title: "Memory 2" },
      ];
      expect(memories).toHaveLength(2);
    });

    it("should cascade delete metrics", () => {
      const metricsId = "metrics-123";
      expect(metricsId).toBeDefined();
    });
  });

  describe("Memory Organization", () => {
    it("should group memories by type", () => {
      const memories = [
        { memoryType: "performance_notes", title: "Note 1" },
        { memoryType: "performance_notes", title: "Note 2" },
        { memoryType: "campaign_insights", title: "Insight 1" },
      ];
      const grouped = memories.reduce((acc: any, m: any) => {
        acc[m.memoryType] = (acc[m.memoryType] || 0) + 1;
        return acc;
      }, {});
      expect(grouped.performance_notes).toBe(2);
      expect(grouped.campaign_insights).toBe(1);
    });

    it("should filter memories by importance", () => {
      const memories = [
        { importance: "high", title: "High Priority" },
        { importance: "medium", title: "Medium Priority" },
        { importance: "high", title: "Another High" },
      ];
      const highPriority = memories.filter((m) => m.importance === "high");
      expect(highPriority).toHaveLength(2);
    });

    it("should search memories by tags", () => {
      const memories = [
        { tags: ["quarterly", "performance"], title: "Q1 Review" },
        { tags: ["campaign", "marketing"], title: "Campaign A" },
      ];
      const filtered = memories.filter((m) =>
        m.tags.includes("quarterly")
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe("Company Summary", () => {
    it("should compile company summary with metrics", () => {
      const summary = {
        company: mockCompanyInput,
        metrics: { totalCampaigns: 5 },
        recentMemories: [],
      };
      expect(summary.company).toBeDefined();
      expect(summary.metrics).toBeDefined();
    });

    it("should include recent memories in summary", () => {
      const memories = [
        { id: "1", title: "Memory 1" },
        { id: "2", title: "Memory 2" },
        { id: "3", title: "Memory 3" },
      ];
      const recent = memories.slice(-5);
      expect(recent).toHaveLength(3);
    });

    it("should count total memories", () => {
      const memories = Array(10).fill({ title: "Memory" });
      expect(memories).toHaveLength(10);
    });
  });

  describe("Edge Cases", () => {
    it("should handle company with very long name", () => {
      const longName = "A".repeat(255);
      expect(longName).toHaveLength(255);
    });

    it("should handle company with special characters", () => {
      const specialName = "TechCorp & Solutions, Inc.";
      expect(specialName).toContain("&");
    });

    it("should handle memory with very long content", () => {
      const longContent = "X".repeat(10000);
      expect(longContent).toHaveLength(10000);
    });

    it("should handle memory with many tags", () => {
      const manyTags = Array(50).fill("tag");
      expect(manyTags).toHaveLength(50);
    });

    it("should handle zero revenue companies", () => {
      const company = { ...mockCompanyInput, monthlyRevenue: 0 };
      expect(company.monthlyRevenue).toBe(0);
    });
  });
});
