import { invokeLLM } from "../_core/llm";

/**
 * Document Ingestion Service
 * Extracts business profile parameters from websites and documents
 */

export interface ExtractedProfile {
  companyName?: string;
  industry?: string;
  targetAudience?: string;
  marketSize?: string;
  competitors?: string[];
  regulatoryLandscape?: string;
  financialTargets?: {
    annualRevenue?: number;
    profitMargin?: number;
    growthRate?: number;
  };
  onlinePresence?: {
    website?: string;
    socialMedia?: string[];
    email?: string;
  };
  timezone?: string;
  language?: string;
}

/**
 * Extract profile from website URL
 */
export async function extractFromWebsite(url: string): Promise<ExtractedProfile> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "MATTIAS-ProfileExtractor/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }

    const html = await response.text();
    const textContent = extractTextFromHtml(html);

    return await analyzeContent(textContent, url);
  } catch (error) {
    console.error("[DocumentIngestion] Website extraction failed:", error);
    throw error;
  }
}

/**
 * Extract profile from document text
 */
export async function extractFromDocument(
  documentText: string,
  documentName?: string
): Promise<ExtractedProfile> {
  try {
    return await analyzeContent(documentText, documentName);
  } catch (error) {
    console.error("[DocumentIngestion] Document extraction failed:", error);
    throw error;
  }
}

/**
 * Analyze content using LLM to extract structured profile
 */
async function analyzeContent(
  content: string,
  source?: string
): Promise<ExtractedProfile> {
  const systemPrompt = `You are a business intelligence analyst. Extract structured business profile information from the provided content. Return a JSON object with the following fields (all optional):
- companyName: string
- industry: string
- targetAudience: string
- marketSize: string
- competitors: string[]
- regulatoryLandscape: string
- financialTargets: { annualRevenue?: number, profitMargin?: number, growthRate?: number }
- onlinePresence: { website?: string, socialMedia?: string[], email?: string }
- timezone: string
- language: string

Only include fields where you found explicit information. Be conservative and accurate.`;

  const userPrompt = `Extract business profile information from this content${source ? ` (source: ${source})` : ""}:

${content.substring(0, 5000)}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "business_profile",
          strict: true,
          schema: {
            type: "object",
            properties: {
              companyName: { type: "string" },
              industry: { type: "string" },
              targetAudience: { type: "string" },
              marketSize: { type: "string" },
              competitors: { type: "array", items: { type: "string" } },
              regulatoryLandscape: { type: "string" },
              financialTargets: {
                type: "object",
                properties: {
                  annualRevenue: { type: "number" },
                  profitMargin: { type: "number" },
                  growthRate: { type: "number" },
                },
              },
              onlinePresence: {
                type: "object",
                properties: {
                  website: { type: "string" },
                  socialMedia: { type: "array", items: { type: "string" } },
                  email: { type: "string" },
                },
              },
              timezone: { type: "string" },
              language: { type: "string" },
            },
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message.content;
    if (!messageContent || typeof messageContent !== "string") {
      throw new Error("No response from LLM");
    }

    const parsed = JSON.parse(messageContent);
    return parsed as ExtractedProfile;
  } catch (error) {
    console.error("[DocumentIngestion] LLM analysis failed:", error);
    throw error;
  }
}

/**
 * Extract text from HTML content
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
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
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
}
