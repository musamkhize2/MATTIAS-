import { invokeLLM } from "../_core/llm";

export interface ScrapedCompanyData {
  name?: string;
  industry?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  monthlyRevenue?: number;
  employeeCount?: number;
  foundedYear?: number;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  keyProducts?: string[];
  keyServices?: string[];
  targetMarket?: string;
  competitors?: string[];
  technologies?: string[];
  certifications?: string[];
  awards?: string[];
  partnerships?: string[];
  fundingStage?: string;
  fundingAmount?: number;
  investors?: string[];
  teamSize?: number;
  headquarters?: string;
  officeLocations?: string[];
  missionStatement?: string;
  visionStatement?: string;
  coreValues?: string[];
  recentNews?: string[];
  blogUrl?: string;
  documentationUrl?: string;
  apiDocumentationUrl?: string;
  pricingUrl?: string;
  customFields?: Record<string, any>;
}

interface ExtractionPrompt {
  html: string;
  url: string;
}

/**
 * Fetch and parse website content
 */
export async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    
    // Fetch the website
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    throw new Error(`Failed to fetch website content: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text content from HTML
 */
export function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

  // Clean up whitespace
  text = text
    .replace(/\s+/g, " ")
    .trim();

  // Limit to first 10000 characters for LLM processing
  return text.substring(0, 10000);
}

/**
 * Extract metadata from HTML head
 */
export function extractMetadata(html: string): Record<string, string> {
  const metadata: Record<string, string> = {};

  // Extract meta descriptions
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (descMatch) metadata.description = descMatch[1];

  // Extract og:description
  const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
  if (ogDescMatch) metadata.ogDescription = ogDescMatch[1];

  // Extract og:title
  const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (ogTitleMatch) metadata.ogTitle = ogTitleMatch[1];

  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1];

  // Extract keywords
  const keywordsMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i);
  if (keywordsMatch) metadata.keywords = keywordsMatch[1];

  return metadata;
}

/**
 * Extract contact information from HTML
 */
export function extractContactInfo(html: string): {
  emails: string[];
  phones: string[];
  socialLinks: Record<string, string>;
} {
  const emails: string[] = [];
  const phones: string[] = [];
  const socialLinks: Record<string, string> = {};

  // Extract emails
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(html)) !== null) {
    if (!emailMatch[1].includes("example.com") && !emails.includes(emailMatch[1])) {
      emails.push(emailMatch[1]);
    }
  }

  // Extract phone numbers
  const phoneRegex = /(\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(html)) !== null) {
    if (!phones.includes(phoneMatch[1])) {
      phones.push(phoneMatch[1]);
    }
  }

  // Extract social links
  const linkedinMatch = html.match(/href=["']([^"']*linkedin\.com[^"']*)/i);
  if (linkedinMatch) socialLinks.linkedin = linkedinMatch[1];

  const twitterMatch = html.match(/href=["']([^"']*twitter\.com[^"']*)/i);
  if (twitterMatch) socialLinks.twitter = twitterMatch[1];

  const facebookMatch = html.match(/href=["']([^"']*facebook\.com[^"']*)/i);
  if (facebookMatch) socialLinks.facebook = facebookMatch[1];

  const instagramMatch = html.match(/href=["']([^"']*instagram\.com[^"']*)/i);
  if (instagramMatch) socialLinks.instagram = instagramMatch[1];

  return { emails, phones, socialLinks };
}

/**
 * Use LLM to extract structured company information from website content
 */
export async function extractCompanyInfoWithLLM(
  html: string,
  url: string
): Promise<ScrapedCompanyData> {
  try {
    const textContent = extractTextFromHTML(html);
    const metadata = extractMetadata(html);
    const contactInfo = extractContactInfo(html);

    const systemPrompt = `You are an expert at extracting company information from website content. 
Extract comprehensive company information from the provided website content and return it as structured JSON.
Be thorough but only include information you can confidently extract from the content.
For numeric values, extract actual numbers when possible.
For lists, provide arrays of strings.
Return ONLY valid JSON, no additional text.`;

    const userPrompt = `Extract company information from this website (${url}):

Website Title: ${metadata.title || "N/A"}
Meta Description: ${metadata.description || "N/A"}
Website Content (first 10000 chars):
${textContent}

Extracted Contact Info:
- Emails: ${contactInfo.emails.join(", ") || "None found"}
- Phones: ${contactInfo.phones.join(", ") || "None found"}
- LinkedIn: ${contactInfo.socialLinks.linkedin || "Not found"}
- Twitter: ${contactInfo.socialLinks.twitter || "Not found"}
- Facebook: ${contactInfo.socialLinks.facebook || "Not found"}
- Instagram: ${contactInfo.socialLinks.instagram || "Not found"}

Extract and return the following information as JSON:
{
  "name": "Company name",
  "industry": "Industry/sector",
  "description": "Company description/mission",
  "location": "Headquarters location",
  "employeeCount": "Number of employees (as integer or null)",
  "foundedYear": "Year founded (as integer or null)",
  "monthlyRevenue": "Estimated monthly revenue (as integer or null)",
  "missionStatement": "Mission statement if available",
  "visionStatement": "Vision statement if available",
  "coreValues": ["value1", "value2"],
  "keyProducts": ["product1", "product2"],
  "keyServices": ["service1", "service2"],
  "targetMarket": "Target market/customer segment",
  "technologies": ["tech1", "tech2"],
  "certifications": ["cert1", "cert2"],
  "awards": ["award1", "award2"],
  "partnerships": ["partner1", "partner2"],
  "fundingStage": "Seed/Series A/etc",
  "fundingAmount": "Total funding (as integer or null)",
  "investors": ["investor1", "investor2"],
  "teamSize": "Team size estimate (as integer or null)",
  "officeLocations": ["location1", "location2"],
  "recentNews": ["news1", "news2"],
  "blogUrl": "Blog URL if available",
  "pricingUrl": "Pricing page URL if available",
  "documentationUrl": "Documentation URL if available",
  "apiDocumentationUrl": "API docs URL if available"
}

Only include fields where you found relevant information. Return valid JSON only.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "company_info",
          strict: false,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              industry: { type: "string" },
              description: { type: "string" },
              location: { type: "string" },
              employeeCount: { type: ["integer", "null"] },
              foundedYear: { type: ["integer", "null"] },
              monthlyRevenue: { type: ["integer", "null"] },
              missionStatement: { type: "string" },
              visionStatement: { type: "string" },
              coreValues: { type: "array", items: { type: "string" } },
              keyProducts: { type: "array", items: { type: "string" } },
              keyServices: { type: "array", items: { type: "string" } },
              targetMarket: { type: "string" },
              technologies: { type: "array", items: { type: "string" } },
              certifications: { type: "array", items: { type: "string" } },
              awards: { type: "array", items: { type: "string" } },
              partnerships: { type: "array", items: { type: "string" } },
              fundingStage: { type: "string" },
              fundingAmount: { type: ["integer", "null"] },
              investors: { type: "array", items: { type: "string" } },
              teamSize: { type: ["integer", "null"] },
              officeLocations: { type: "array", items: { type: "string" } },
              recentNews: { type: "array", items: { type: "string" } },
              blogUrl: { type: "string" },
              pricingUrl: { type: "string" },
              documentationUrl: { type: "string" },
              apiDocumentationUrl: { type: "string" },
            },
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Invalid LLM response format");
    }

    const extractedData = JSON.parse(content) as ScrapedCompanyData;

    // Merge with contact info
    if (contactInfo.emails.length > 0 && !extractedData.contactEmail) {
      extractedData.contactEmail = contactInfo.emails[0];
    }
    if (contactInfo.phones.length > 0 && !extractedData.contactPhone) {
      extractedData.contactPhone = contactInfo.phones[0];
    }
    if (Object.keys(contactInfo.socialLinks).length > 0) {
      extractedData.socialLinks = contactInfo.socialLinks as any;
    }

    extractedData.website = url;

    return extractedData;
  } catch (error) {
    throw new Error(
      `Failed to extract company info with LLM: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Main function to scrape and extract company information from website
 */
export async function scrapeCompanyWebsite(url: string): Promise<ScrapedCompanyData> {
  try {
    // Normalize URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Fetch website content
    const html = await fetchWebsiteContent(normalizedUrl);

    // Extract company information using LLM
    const companyData = await extractCompanyInfoWithLLM(html, normalizedUrl);

    return companyData;
  } catch (error) {
    throw new Error(
      `Failed to scrape company website: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate and clean extracted company data
 */
export function validateAndCleanCompanyData(data: ScrapedCompanyData): ScrapedCompanyData {
  const cleaned: ScrapedCompanyData = {};

  // String fields
  if (data.name && typeof data.name === "string") {
    cleaned.name = data.name.trim().substring(0, 255);
  }
  if (data.industry && typeof data.industry === "string") {
    cleaned.industry = data.industry.trim().substring(0, 255);
  }
  if (data.description && typeof data.description === "string") {
    cleaned.description = data.description.trim().substring(0, 2000);
  }
  if (data.website && typeof data.website === "string") {
    cleaned.website = data.website.trim();
  }
  if (data.contactEmail && typeof data.contactEmail === "string") {
    const email = data.contactEmail.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      cleaned.contactEmail = email;
    }
  }
  if (data.contactPhone && typeof data.contactPhone === "string") {
    cleaned.contactPhone = data.contactPhone.trim().substring(0, 20);
  }
  if (data.location && typeof data.location === "string") {
    cleaned.location = data.location.trim().substring(0, 255);
  }

  // Numeric fields
  if (data.monthlyRevenue && typeof data.monthlyRevenue === "number" && data.monthlyRevenue > 0) {
    cleaned.monthlyRevenue = Math.floor(data.monthlyRevenue);
  }
  if (data.employeeCount && typeof data.employeeCount === "number" && data.employeeCount > 0) {
    cleaned.employeeCount = Math.floor(data.employeeCount);
  }
  if (data.foundedYear && typeof data.foundedYear === "number") {
    const year = Math.floor(data.foundedYear);
    if (year > 1800 && year <= new Date().getFullYear()) {
      cleaned.foundedYear = year;
    }
  }

  // Text fields
  if (data.missionStatement && typeof data.missionStatement === "string") {
    cleaned.missionStatement = data.missionStatement.trim().substring(0, 1000);
  }
  if (data.visionStatement && typeof data.visionStatement === "string") {
    cleaned.visionStatement = data.visionStatement.trim().substring(0, 1000);
  }
  if (data.targetMarket && typeof data.targetMarket === "string") {
    cleaned.targetMarket = data.targetMarket.trim().substring(0, 500);
  }
  if (data.fundingStage && typeof data.fundingStage === "string") {
    cleaned.fundingStage = data.fundingStage.trim().substring(0, 100);
  }

  // Array fields
  if (Array.isArray(data.coreValues)) {
    cleaned.coreValues = data.coreValues
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.keyProducts)) {
    cleaned.keyProducts = data.keyProducts
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.keyServices)) {
    cleaned.keyServices = data.keyServices
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.technologies)) {
    cleaned.technologies = data.technologies
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 20);
  }
  if (Array.isArray(data.certifications)) {
    cleaned.certifications = data.certifications
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.awards)) {
    cleaned.awards = data.awards
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.partnerships)) {
    cleaned.partnerships = data.partnerships
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.investors)) {
    cleaned.investors = data.investors
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.officeLocations)) {
    cleaned.officeLocations = data.officeLocations
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 10);
  }
  if (Array.isArray(data.recentNews)) {
    cleaned.recentNews = data.recentNews
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 5);
  }

  // Social links
  if (data.socialLinks && typeof data.socialLinks === "object") {
    cleaned.socialLinks = {};
    if (data.socialLinks.linkedin) {
      cleaned.socialLinks.linkedin = String(data.socialLinks.linkedin).trim();
    }
    if (data.socialLinks.twitter) {
      cleaned.socialLinks.twitter = String(data.socialLinks.twitter).trim();
    }
    if (data.socialLinks.facebook) {
      cleaned.socialLinks.facebook = String(data.socialLinks.facebook).trim();
    }
    if (data.socialLinks.instagram) {
      cleaned.socialLinks.instagram = String(data.socialLinks.instagram).trim();
    }
  }

  return cleaned;
}
