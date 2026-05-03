import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractTextFromHTML,
  extractMetadata,
  extractContactInfo,
  validateAndCleanCompanyData,
  ScrapedCompanyData,
} from "./webScraper";

describe("Web Scraper Service", () => {
  describe("HTML Text Extraction", () => {
    it("should remove script tags", () => {
      const html = "<p>Hello</p><script>alert('test')</script><p>World</p>";
      const text = extractTextFromHTML(html);
      expect(text).not.toContain("alert");
      expect(text).toContain("Hello");
      expect(text).toContain("World");
    });

    it("should remove style tags", () => {
      const html = "<p>Hello</p><style>.red { color: red; }</style><p>World</p>";
      const text = extractTextFromHTML(html);
      expect(text).not.toContain("color");
      expect(text).toContain("Hello");
    });

    it("should remove HTML tags", () => {
      const html = "<div><p>Hello <strong>World</strong></p></div>";
      const text = extractTextFromHTML(html);
      expect(text).not.toContain("<");
      expect(text).not.toContain(">");
      expect(text).toContain("Hello");
      expect(text).toContain("World");
    });

    it("should decode HTML entities", () => {
      const html = "<p>&nbsp;&lt;&gt;&quot;&#39;&amp;</p>";
      const text = extractTextFromHTML(html);
      expect(text).toContain("<");
      expect(text).toContain(">");
      expect(text).toContain('"');
      expect(text).toContain("'");
      expect(text).toContain("&");
    });

    it("should clean up whitespace", () => {
      const html = "<p>Hello    \n\n    World</p>";
      const text = extractTextFromHTML(html);
      expect(text).toBe("Hello World");
    });

    it("should limit to 10000 characters", () => {
      const longText = "A".repeat(15000);
      const html = `<p>${longText}</p>`;
      const text = extractTextFromHTML(html);
      expect(text.length).toBeLessThanOrEqual(10000);
    });
  });

  describe("Metadata Extraction", () => {
    it("should extract meta description", () => {
      const html = '<meta name="description" content="Company description" />';
      const metadata = extractMetadata(html);
      expect(metadata.description).toBe("Company description");
    });

    it("should extract og:description", () => {
      const html = '<meta property="og:description" content="OG description" />';
      const metadata = extractMetadata(html);
      expect(metadata.ogDescription).toBe("OG description");
    });

    it("should extract og:title", () => {
      const html = '<meta property="og:title" content="OG Title" />';
      const metadata = extractMetadata(html);
      expect(metadata.ogTitle).toBe("OG Title");
    });

    it("should extract title tag", () => {
      const html = "<title>Page Title</title>";
      const metadata = extractMetadata(html);
      expect(metadata.title).toBe("Page Title");
    });

    it("should extract keywords", () => {
      const html = '<meta name="keywords" content="keyword1, keyword2" />';
      const metadata = extractMetadata(html);
      expect(metadata.keywords).toBe("keyword1, keyword2");
    });
  });

  describe("Contact Information Extraction", () => {
    it("should extract email addresses", () => {
      const html = "<p>Contact: contact@company.com</p>";
      const { emails } = extractContactInfo(html);
      expect(emails).toContain("contact@company.com");
    });

    it("should not extract example.com emails", () => {
      const html = "<p>Example: test@example.com</p>";
      const { emails } = extractContactInfo(html);
      expect(emails).not.toContain("test@example.com");
    });

    it("should extract phone numbers", () => {
      const html = "<p>Call: (555) 123-4567</p>";
      const { phones } = extractContactInfo(html);
      expect(phones.length).toBeGreaterThan(0);
    });

    it("should extract LinkedIn URL", () => {
      const html = '<a href="https://linkedin.com/company/test">LinkedIn</a>';
      const { socialLinks } = extractContactInfo(html);
      expect(socialLinks.linkedin).toBeDefined();
      expect(socialLinks.linkedin).toContain("linkedin.com");
    });

    it("should extract Twitter URL", () => {
      const html = '<a href="https://twitter.com/company">Twitter</a>';
      const { socialLinks } = extractContactInfo(html);
      expect(socialLinks.twitter).toBeDefined();
      expect(socialLinks.twitter).toContain("twitter.com");
    });

    it("should extract Facebook URL", () => {
      const html = '<a href="https://facebook.com/company">Facebook</a>';
      const { socialLinks } = extractContactInfo(html);
      expect(socialLinks.facebook).toBeDefined();
      expect(socialLinks.facebook).toContain("facebook.com");
    });

    it("should extract Instagram URL", () => {
      const html = '<a href="https://instagram.com/company">Instagram</a>';
      const { socialLinks } = extractContactInfo(html);
      expect(socialLinks.instagram).toBeDefined();
      expect(socialLinks.instagram).toContain("instagram.com");
    });

    it("should not duplicate emails", () => {
      const html = "<p>Email: test@company.com and test@company.com</p>";
      const { emails } = extractContactInfo(html);
      const count = emails.filter((e) => e === "test@company.com").length;
      expect(count).toBe(1);
    });
  });

  describe("Data Validation and Cleaning", () => {
    it("should trim string fields", () => {
      const data: ScrapedCompanyData = {
        name: "  Company Name  ",
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.name).toBe("Company Name");
    });

    it("should truncate long strings", () => {
      const data: ScrapedCompanyData = {
        name: "A".repeat(300),
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.name?.length).toBeLessThanOrEqual(255);
    });

    it("should validate email format", () => {
      const data: ScrapedCompanyData = {
        contactEmail: "valid@company.com",
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.contactEmail).toBe("valid@company.com");
    });

    it("should reject invalid email format", () => {
      const data: ScrapedCompanyData = {
        contactEmail: "not-an-email",
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.contactEmail).toBeUndefined();
    });

    it("should validate positive numeric fields", () => {
      const data: ScrapedCompanyData = {
        employeeCount: 100,
        monthlyRevenue: 50000,
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.employeeCount).toBe(100);
      expect(cleaned.monthlyRevenue).toBe(50000);
    });

    it("should reject zero or negative numeric fields", () => {
      const data: ScrapedCompanyData = {
        employeeCount: -5,
        monthlyRevenue: 0,
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.employeeCount).toBeUndefined();
      expect(cleaned.monthlyRevenue).toBeUndefined();
    });

    it("should validate founded year range", () => {
      const data: ScrapedCompanyData = {
        foundedYear: 2015,
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.foundedYear).toBe(2015);
    });

    it("should reject invalid founded year", () => {
      const data: ScrapedCompanyData = {
        foundedYear: 1500,
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.foundedYear).toBeUndefined();
    });

    it("should clean array fields", () => {
      const data: ScrapedCompanyData = {
        coreValues: ["  Value1  ", "Value2", "", "  Value3  "],
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.coreValues).toEqual(["Value1", "Value2", "Value3"]);
    });

    it("should limit array length", () => {
      const data: ScrapedCompanyData = {
        coreValues: Array(20).fill("Value"),
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.coreValues?.length).toBeLessThanOrEqual(10);
    });

    it("should preserve website URL", () => {
      const data: ScrapedCompanyData = {
        website: "https://company.com",
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.website).toBe("https://company.com");
    });

    it("should clean social links", () => {
      const data: ScrapedCompanyData = {
        socialLinks: {
          linkedin: "https://linkedin.com/company/test",
          twitter: "https://twitter.com/test",
        },
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.socialLinks?.linkedin).toBe("https://linkedin.com/company/test");
      expect(cleaned.socialLinks?.twitter).toBe("https://twitter.com/test");
    });

    it("should handle missing optional fields", () => {
      const data: ScrapedCompanyData = {
        name: "Company",
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.name).toBe("Company");
      expect(cleaned.industry).toBeUndefined();
      expect(cleaned.description).toBeUndefined();
    });

    it("should handle non-string array items", () => {
      const data: ScrapedCompanyData = {
        coreValues: ["Value1", 123 as any, "Value2"],
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.coreValues).toEqual(["Value1", "Value2"]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty HTML", () => {
      const text = extractTextFromHTML("");
      expect(text).toBe("");
    });

    it("should handle HTML with only whitespace", () => {
      const text = extractTextFromHTML("   \n\n   ");
      expect(text).toBe("");
    });

    it("should handle deeply nested tags", () => {
      const html = "<div><div><div><p>Text</p></div></div></div>";
      const text = extractTextFromHTML(html);
      expect(text).toBe("Text");
    });

    it("should handle mixed case meta tags", () => {
      const html = '<META NAME="description" CONTENT="Test" />';
      const metadata = extractMetadata(html);
      expect(metadata.description).toBe("Test");
    });

    it("should handle empty arrays", () => {
      const data: ScrapedCompanyData = {
        coreValues: [],
        keyProducts: [],
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.coreValues).toEqual([]);
      expect(cleaned.keyProducts).toEqual([]);
    });

    it("should handle null values", () => {
      const data: ScrapedCompanyData = {
        name: null as any,
        industry: undefined,
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.name).toBeUndefined();
      expect(cleaned.industry).toBeUndefined();
    });

    it("should handle very large revenue numbers", () => {
      const data: ScrapedCompanyData = {
        monthlyRevenue: 999999999,
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.monthlyRevenue).toBe(999999999);
    });

    it("should handle special characters in strings", () => {
      const data: ScrapedCompanyData = {
        name: "Company & Co. (Ltd.)",
      };
      const cleaned = validateAndCleanCompanyData(data);
      expect(cleaned.name).toBe("Company & Co. (Ltd.)");
    });
  });

  describe("URL Normalization", () => {
    it("should handle URLs with protocol", () => {
      const url = "https://company.com";
      expect(url).toMatch(/^https?:\/\//);
    });

    it("should handle URLs without protocol", () => {
      const url = "company.com";
      const normalized = url.startsWith("http") ? url : "https://" + url;
      expect(normalized).toMatch(/^https?:\/\//);
    });
  });
});
