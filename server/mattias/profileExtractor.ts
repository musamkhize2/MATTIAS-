import { invokeLLM } from "../_core/llm";
import { z } from "zod";

/**
 * Profile Extractor Service
 * Extracts business profile parameters from websites and documents using LLM
 */

export const ProfileExtractionSchema = z.object({
  businessName: z.string().optional(),
  industry: z.string().optional(),
  targetMarket: z.string().optional(),
  revenueTarget: z.number().optional(),
  profitMargin: z.number().optional(),
  operatingHours: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  aiPersonality: z.string().optional(),
  riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  automationLevel: z.enum(["manual", "assisted", "approval_guarded", "autonomous"]).optional(),
});

export type ProfileExtraction = z.infer<typeof ProfileExtractionSchema>;

export async function extractProfileFromWebsite(url: string): Promise<ProfileExtraction> {
  try {
    // Fetch website content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);

    const html = await response.text();
    clearTimeout(timeoutId);

    // Extract text from HTML (simple approach)
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .substring(0, 5000); // Limit to first 5000 chars

    // Use LLM to extract profile information
    const extractionPrompt = `
You are a business intelligence analyst. Extract the following information from the website content below.
Return ONLY valid JSON matching this schema:
{
  "businessName": "string or null",
  "industry": "string or null",
  "targetMarket": "string or null",
  "revenueTarget": "number or null",
  "profitMargin": "number or null",
  "operatingHours": "string or null",
  "timezone": "string or null",
  "language": "string or null",
  "aiPersonality": "string or null",
  "riskTolerance": "conservative|moderate|aggressive or null",
  "automationLevel": "manual|assisted|approval_guarded|autonomous or null"
}

Website content:
${textContent}
`;

    const response_llm = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a business intelligence analyst. Extract business profile information and return only valid JSON.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "profile_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              businessName: { type: ["string", "null"] },
              industry: { type: ["string", "null"] },
              targetMarket: { type: ["string", "null"] },
              revenueTarget: { type: ["number", "null"] },
              profitMargin: { type: ["number", "null"] },
              operatingHours: { type: ["string", "null"] },
              timezone: { type: ["string", "null"] },
              language: { type: ["string", "null"] },
              aiPersonality: { type: ["string", "null"] },
              riskTolerance: { type: ["string", "null"], enum: ["conservative", "moderate", "aggressive"] },
              automationLevel: { type: ["string", "null"], enum: ["manual", "assisted", "approval_guarded", "autonomous"] },
            },
            required: [],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response_llm.choices[0]?.message.content;
    if (!content) throw new Error("No response from LLM");

    const extracted = JSON.parse(String(content));
    return ProfileExtractionSchema.parse(extracted);
  } catch (error) {
    console.error("Profile extraction failed:", error);
    return {};
  }
}

export async function extractProfileFromDocument(documentText: string): Promise<ProfileExtraction> {
  try {
    // Use LLM to extract profile information from document
    const extractionPrompt = `
You are a business intelligence analyst. Extract the following information from the business document below.
Return ONLY valid JSON matching this schema:
{
  "businessName": "string or null",
  "industry": "string or null",
  "targetMarket": "string or null",
  "revenueTarget": "number or null",
  "profitMargin": "number or null",
  "operatingHours": "string or null",
  "timezone": "string or null",
  "language": "string or null",
  "aiPersonality": "string or null",
  "riskTolerance": "conservative|moderate|aggressive or null",
  "automationLevel": "manual|assisted|approval_guarded|autonomous or null"
}

Document content:
${documentText.substring(0, 5000)}
`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a business intelligence analyst. Extract business profile information and return only valid JSON.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "profile_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              businessName: { type: ["string", "null"] },
              industry: { type: ["string", "null"] },
              targetMarket: { type: ["string", "null"] },
              revenueTarget: { type: ["number", "null"] },
              profitMargin: { type: ["number", "null"] },
              operatingHours: { type: ["string", "null"] },
              timezone: { type: ["string", "null"] },
              language: { type: ["string", "null"] },
              aiPersonality: { type: ["string", "null"] },
              riskTolerance: { type: ["string", "null"], enum: ["conservative", "moderate", "aggressive"] },
              automationLevel: { type: ["string", "null"], enum: ["manual", "assisted", "approval_guarded", "autonomous"] },
            },
            required: [],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("No response from LLM");

    const extracted = JSON.parse(String(content));
    return ProfileExtractionSchema.parse(extracted);
  } catch (error) {
    console.error("Document extraction failed:", error);
    return {};
  }
}
