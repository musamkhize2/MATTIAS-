import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getDb } from "../db";
import { createCompany, getCompany, getCompanies, deleteCompany } from "./companyManagement";
import { users, tenants, companies } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Regression test for company creation after schema restore
 * Verifies that the companies table is properly defined and functional
 */
describe("Company Creation Regression Test", () => {
  let db: any;
  let testTenantId: number;
  let testUserId: number;
  const testCompanyData = {
    name: "The Millionaire Sales Institute",
    industry: "Sales Training and Coaching",
    website: "https://themillionairesalesinstitute.com",
    description: "Sales training and coaching company",
    location: "Online",
  };

  beforeAll(async () => {
    db = await getDb();
    expect(db).toBeDefined();

    // Create test tenant
    const tenantResult = await db.insert(tenants).values({
      name: "Test Tenant",
      features: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get the inserted tenant ID
    const tenantRows = await db.select().from(tenants).limit(1);
    testTenantId = tenantRows[0].id;

    // Create test user
    const userResult = await db.insert(users).values({
      openId: "test-user-" + Date.now(),
      name: "Test User",
      email: "test@example.com",
      loginMethod: "test",
      role: "user",
      tenantId: testTenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    // Get the inserted user ID
    const userRows = await db.select().from(users).where(eq(users.openId, "test-user-" + Date.now())).limit(1);
    if (userRows.length > 0) {
      testUserId = userRows[0].id;
    } else {
      // Fallback: get the last user
      const allUsers = await db.select().from(users).limit(1);
      testUserId = allUsers[0].id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (db && testTenantId) {
      try {
        // Delete all companies for the test tenant
        await db.delete(companies).where(eq(companies.tenantId, testTenantId));
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  });

  it("should create a company successfully", async () => {
    const companyId = await createCompany(testTenantId, testUserId, testCompanyData);
    expect(companyId).toBeDefined();
    expect(typeof companyId).toBe("string");
  });

  it("should retrieve a created company by ID", async () => {
    const companyId = await createCompany(testTenantId, testUserId, testCompanyData);
    const company = await getCompany(companyId, testTenantId);

    expect(company).toBeDefined();
    expect(company.id).toBe(companyId);
    expect(company.name).toBe(testCompanyData.name);
    expect(company.industry).toBe(testCompanyData.industry);
    expect(company.website).toBe(testCompanyData.website);
    expect(company.tenantId).toBe(testTenantId);
  });

  it("should list all companies for a tenant", async () => {
    const companyId = await createCompany(testTenantId, testUserId, testCompanyData);
    const companies_list = await getCompanies(testTenantId);

    expect(Array.isArray(companies_list)).toBe(true);
    expect(companies_list.length).toBeGreaterThan(0);

    const createdCompany = companies_list.find((c: any) => c.id === companyId);
    expect(createdCompany).toBeDefined();
    expect(createdCompany.name).toBe(testCompanyData.name);
  });

  it("should handle company with optional fields", async () => {
    const companyWithOptionals = {
      name: "Tech Startup",
      industry: "Software",
      monthlyRevenue: 50000,
      employeeCount: 10,
      foundedYear: 2020,
      contactEmail: "contact@techstartup.com",
      contactPhone: "+1-555-0123",
    };

    const companyId = await createCompany(testTenantId, testUserId, companyWithOptionals);
    const company = await getCompany(companyId, testTenantId);

    expect(company.monthlyRevenue).toBe(50000);
    expect(company.employeeCount).toBe(10);
    expect(company.foundedYear).toBe(2020);
    expect(company.contactEmail).toBe("contact@techstartup.com");
  });

  it("should delete a company", async () => {
    const companyId = await createCompany(testTenantId, testUserId, testCompanyData);
    await deleteCompany(companyId, testTenantId);

    const company = await getCompany(companyId, testTenantId);
    expect(company).toBeNull();
  });

  it("should not retrieve companies from other tenants", async () => {
    // Create a company for the test tenant
    const companyId = await createCompany(testTenantId, testUserId, testCompanyData);

    // Try to retrieve it with a different tenant ID
    const company = await getCompany(companyId, testTenantId + 999);
    expect(company).toBeNull();
  });
});
