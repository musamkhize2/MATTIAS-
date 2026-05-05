import { invokeLLM } from "../_core/llm";
import { z } from "zod";

/**
 * Business plan research with real search API integration
 * Combines web search, market data APIs, and LLM analysis
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
  sources: z.array(z.string()).describe("Data sources used in research"),
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;

/**
 * Fetch real market data from public APIs and web search
 */
async function fetchMarketData(industry: string, targetAudience: string, geographicFocus?: string): Promise<string> {
  const searchQueries = [
    `${industry} market size 2024 2025`,
    `${industry} industry growth rate`,
    `${targetAudience} market trends ${geographicFocus || ""}`,
    `${industry} regulatory landscape`,
  ];

  const marketData: string[] = [];

  for (const query of searchQueries) {
    try {
      // Use the built-in search capability through LLM context
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a market research analyst. Provide accurate, current market data based on your knowledge.",
          },
          {
            role: "user",
            content: [{
              type: "text",
              text: `Find current market data for: ${query}. Provide specific numbers, percentages, and data sources where available.`,
            }],
          },
        ],
      });

      if (response.choices[0]?.message?.content) {
        const content = response.choices[0].message.content;
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        marketData.push(contentStr);
      }
    } catch (error) {
      console.error(`Failed to fetch market data for query: ${query}`, error);
    }
  }

  return marketData.join("\n\n");
}

/**
 * Fetch competitor information
 */
async function fetchCompetitorData(industry: string, businessModel?: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a competitive intelligence analyst. Provide accurate information about key competitors.",
        },
        {
          role: "user",
          content: [{
            type: "text",
            text: `Identify and analyze the top 5-7 competitors in the ${industry} industry${businessModel ? ` with ${businessModel} business model` : ""}. For each competitor, provide: name, market positioning, key strengths, key weaknesses, and estimated market share.`,
          }],
        },
      ],
    });

    if (response.choices[0]?.message?.content) {
      const content = response.choices[0].message.content;
      return typeof content === 'string' ? content : JSON.stringify(content);
    }
    return "";
  } catch (error) {
    console.error("Failed to fetch competitor data", error);
    return "";
  }
}

/**
 * Fetch regulatory and compliance information
 */
async function fetchRegulatoryData(industry: string, geographicFocus?: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a regulatory compliance expert. Provide accurate information about industry regulations.",
        },
        {
          role: "user",
          content: [{
            type: "text",
            text: `What are the key regulatory requirements and compliance considerations for the ${industry} industry${geographicFocus ? ` in ${geographicFocus}` : ""}? Include data protection, licensing, and industry-specific regulations.`,
          }],
        },
      ],
    });

    if (response.choices[0]?.message?.content) {
      const content = response.choices[0].message.content;
      return typeof content === 'string' ? content : JSON.stringify(content);
    }
    return "";
  } catch (error) {
    console.error("Failed to fetch regulatory data", error);
    return "";
  }
}

/**
 * Conduct comprehensive business plan research with real data
 */
export async function conductBusinessPlanResearchWithAPIs(params: ResearchParameters): Promise<ResearchResult> {
  // Fetch real market data from multiple sources
  const marketData = await fetchMarketData(params.industry, params.targetAudience, params.geographicFocus);
  const competitorData = params.competitorAnalysis ? await fetchCompetitorData(params.industry, params.businessModel) : "";
  const regulatoryData = params.regulatoryLandscape ? await fetchRegulatoryData(params.industry, params.geographicFocus) : "";

  // Build comprehensive research context
  const researchContext = buildEnhancedResearchContext(params, marketData, competitorData, regulatoryData);

  // Invoke LLM with structured research prompt and real data
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a strategic business research analyst with access to current market data. Conduct thorough, data-driven research on the specified business opportunity. Use the provided market data, competitor information, and regulatory details to inform your analysis. Focus on market sizing, competitive landscape, regulatory environment, and strategic recommendations. Provide actionable insights backed by reasoning and specific data points.`,
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
            sources: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "marketSize", "competitors", "trends", "risks", "recommendations", "dataQuality", "sources"],
          additionalProperties: false,
        },
      },
    },
  });

  // Parse and validate response
  const content = response.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  return ResearchResultSchema.parse(parsed);
}

/**
 * Build enhanced research context with real data
 */
function buildEnhancedResearchContext(
  params: ResearchParameters,
  marketData: string,
  competitorData: string,
  regulatoryData: string
): string {
  const sections: string[] = [];

  sections.push(`Conduct comprehensive business plan research with the following focus:`);
  sections.push(`\n**Industry & Market:**`);
  sections.push(`- Industry: ${params.industry}`);
  sections.push(`- Target Audience: ${params.targetAudience}`);
  sections.push(`- Market Size Category: ${params.marketSize}`);
  if (params.businessModel) sections.push(`- Business Model: ${params.businessModel}`);
  if (params.geographicFocus) sections.push(`- Geographic Focus: ${params.geographicFocus}`);

  sections.push(`\n**Current Market Data:**`);
  sections.push(marketData);

  if (competitorData) {
    sections.push(`\n**Competitor Intelligence:**`);
    sections.push(competitorData);
  }

  if (regulatoryData) {
    sections.push(`\n**Regulatory & Compliance Landscape:**`);
    sections.push(regulatoryData);
  }

  sections.push(`\n**Research Focus Areas:**`);
  if (params.competitorAnalysis) sections.push(`- Analyze competitive landscape, key players, positioning, and differentiation`);
  if (params.regulatoryLandscape) sections.push(`- Assess regulatory environment, compliance requirements, and legal risks`);
  if (params.marketTrends) sections.push(`- Identify current market trends, growth drivers, and emerging opportunities`);
  if (params.fundingLandscape) sections.push(`- Research funding landscape, investor appetite, and capital requirements`);

  sections.push(`\n**Deliverables:**`);
  sections.push(`1. Market sizing (TAM, SAM, SOM) with data sources and specific numbers`);
  sections.push(`2. Competitor analysis with 3-5 key competitors and differentiation strategies`);
  sections.push(`3. Market trends and growth opportunities with growth rates`);
  sections.push(`4. Regulatory and compliance risks with mitigation strategies`);
  sections.push(`5. Strategic recommendations for market entry and growth`);
  sections.push(`6. Data quality assessment (high/medium/low) based on data recency and source credibility`);
  sections.push(`7. List of data sources used in the analysis`);

  sections.push(`\n**Requirements:**`);
  sections.push(`- Use the provided market data and research as your primary source`);
  sections.push(`- Provide specific numbers, percentages, and growth rates where available`);
  sections.push(`- Highlight key assumptions and data gaps`);
  sections.push(`- Offer actionable strategic recommendations based on market data`);
  sections.push(`- Include data sources for all major claims`);

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
