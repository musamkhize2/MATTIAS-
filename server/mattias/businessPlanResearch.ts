import { invokeLLM } from "../_core/llm";
import { z } from "zod";

/**
 * Business plan research parameters to guide focused, contextual research
 */
export const ResearchParametersSchema = z.object({
  industry: z.string().describe("Industry or sector (e.g., SaaS, E-commerce, FinTech)"),
  targetAudience: z.string().describe("Primary target customer segment"),
  marketSize: z.enum(["startup", "small", "medium", "large", "enterprise"]).describe("Estimated market size"),
  competitorAnalysis: z.boolean().default(true).describe("Include competitor landscape analysis"),
  regulatoryLandscape: z.boolean().default(true).describe("Include regulatory and compliance analysis"),
  marketTrends: z.boolean().default(true).describe("Include current market trends and opportunities"),
  fundingLandscape: z.boolean().default(false).describe("Include funding and investment landscape"),
  geographicFocus: z.string().optional().describe("Geographic region (e.g., US, EU, APAC)"),
  businessModel: z.string().optional().describe("Business model (e.g., B2B, B2C, D2C, Marketplace)"),
});

export type ResearchParameters = z.infer<typeof ResearchParametersSchema>;

/**
 * Research result with structured insights
 */
export const ResearchResultSchema = z.object({
  summary: z.string().describe("Executive summary of research findings"),
  marketSize: z.object({
    tam: z.string().describe("Total Addressable Market"),
    sam: z.string().describe("Serviceable Available Market"),
    som: z.string().describe("Serviceable Obtainable Market"),
  }).describe("Market sizing analysis"),
  competitors: z.array(z.object({
    name: z.string(),
    positioning: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  })).describe("Competitor analysis"),
  trends: z.array(z.string()).describe("Key market trends and opportunities"),
  risks: z.array(z.string()).describe("Market and regulatory risks"),
  recommendations: z.array(z.string()).describe("Strategic recommendations"),
  dataQuality: z.enum(["high", "medium", "low"]).describe("Quality score of research data"),
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;

/**
 * Conduct smart, context-aware business plan research
 */
export async function conductBusinessPlanResearch(params: ResearchParameters): Promise<ResearchResult> {
  // Build research context from parameters
  const researchContext = buildResearchContext(params);

  // Invoke LLM with structured research prompt
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a strategic business research analyst. Conduct thorough, data-driven research on the specified business opportunity. Focus on market sizing, competitive landscape, regulatory environment, and strategic recommendations. Provide actionable insights backed by reasoning.`,
      },
      {
        role: "user",
        content: researchContext,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "business_plan_research",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            marketSize: {
              type: "object",
              properties: {
                tam: { type: "string" },
                sam: { type: "string" },
                som: { type: "string" },
              },
              required: ["tam", "sam", "som"],
            },
            competitors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  positioning: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                },
                required: ["name", "positioning", "strengths", "weaknesses"],
              },
            },
            trends: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            dataQuality: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["summary", "marketSize", "competitors", "trends", "risks", "recommendations", "dataQuality"],
          additionalProperties: false,
        },
      },
    },
  });

  // Parse and validate response
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("No response from LLM");

  const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  return ResearchResultSchema.parse(parsed);
}

/**
 * Build comprehensive research context from parameters
 */
function buildResearchContext(params: ResearchParameters): string {
  const sections: string[] = [];

  sections.push(`Conduct comprehensive business plan research with the following focus:`);
  sections.push(`\n**Industry & Market:**`);
  sections.push(`- Industry: ${params.industry}`);
  sections.push(`- Target Audience: ${params.targetAudience}`);
  sections.push(`- Market Size Category: ${params.marketSize}`);
  if (params.businessModel) sections.push(`- Business Model: ${params.businessModel}`);
  if (params.geographicFocus) sections.push(`- Geographic Focus: ${params.geographicFocus}`);

  sections.push(`\n**Research Focus Areas:**`);
  if (params.competitorAnalysis) sections.push(`- Analyze competitive landscape, key players, positioning, and differentiation`);
  if (params.regulatoryLandscape) sections.push(`- Assess regulatory environment, compliance requirements, and legal risks`);
  if (params.marketTrends) sections.push(`- Identify current market trends, growth drivers, and emerging opportunities`);
  if (params.fundingLandscape) sections.push(`- Research funding landscape, investor appetite, and capital requirements`);

  sections.push(`\n**Deliverables:**`);
  sections.push(`1. Market sizing (TAM, SAM, SOM) with data sources`);
  sections.push(`2. Competitor analysis with 3-5 key competitors`);
  sections.push(`3. Market trends and growth opportunities`);
  sections.push(`4. Regulatory and compliance risks`);
  sections.push(`5. Strategic recommendations for market entry and growth`);
  sections.push(`6. Data quality assessment (high/medium/low)`);

  sections.push(`\n**Requirements:**`);
  sections.push(`- Base analysis on real market data and credible sources`);
  sections.push(`- Provide specific numbers and percentages where available`);
  sections.push(`- Highlight key assumptions and data gaps`);
  sections.push(`- Offer actionable strategic recommendations`);

  return sections.join("\n");
}

/**
 * Cache research results to avoid duplicate queries
 */
const researchCache = new Map<string, { result: ResearchResult; timestamp: number }>();

export function getCachedResearch(cacheKey: string): ResearchResult | null {
  const cached = researchCache.get(cacheKey);
  if (!cached) return null;

  // Cache expires after 24 hours
  if (Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
    researchCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

export function cacheResearch(cacheKey: string, result: ResearchResult): void {
  researchCache.set(cacheKey, { result, timestamp: Date.now() });
}

export function generateCacheKey(params: ResearchParameters): string {
  return `research_${params.industry}_${params.targetAudience}_${params.marketSize}`.toLowerCase().replace(/\s+/g, "_");
}
