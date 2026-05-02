import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

export const businessPlanRouter = router({
  /**
   * Research business plan with smart parameters
   */
  research: protectedProcedure
    .input(
      z.object({
        businessName: z.string(),
        industry: z.string(),
        marketSize: z.enum(["small", "medium", "large", "enterprise"]),
        targetAudience: z.string(),
        competitorAnalysis: z.boolean().default(true),
        regulatoryLandscape: z.boolean().default(true),
        businessProfileId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Build research prompt with parameters
      const researchPrompt = buildResearchPrompt(input);

      // Invoke LLM for research
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a business research analyst. Provide comprehensive, structured research findings based on the given parameters.",
          },
          {
            role: "user",
            content: researchPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "business_research",
            strict: true,
            schema: {
              type: "object",
              properties: {
                marketAnalysis: {
                  type: "string",
                  description: "Market size, growth trends, and opportunities",
                },
                competitorAnalysis: {
                  type: "string",
                  description: "Key competitors and competitive landscape",
                },
                regulatoryFactors: {
                  type: "string",
                  description: "Regulatory requirements and compliance factors",
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Strategic recommendations",
                },
                riskFactors: {
                  type: "array",
                  items: { type: "string" },
                  description: "Identified risk factors",
                },
                qualityScore: {
                  type: "number",
                  description: "Research quality score (0-100)",
                },
              },
              required: [
                "marketAnalysis",
                "competitorAnalysis",
                "regulatoryFactors",
                "recommendations",
                "riskFactors",
                "qualityScore",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message.content;
      if (!content || typeof content !== "string") {
        throw new Error("Invalid LLM response");
      }

      const research = JSON.parse(content);

      return {
        success: true,
        research: {
          ...research,
          timestamp: new Date(),
          businessName: input.businessName,
          industry: input.industry,
        },
      };
    }),

  /**
   * Get research history for a business profile
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        businessProfileId: z.number(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      // Placeholder: In production, query from database
      return {
        history: [
          {
            id: 1,
            timestamp: new Date(),
            businessName: "Sample Business",
            industry: "Technology",
            qualityScore: 92,
          },
        ],
      };
    }),

  /**
   * Cache research results
   */
  cacheResult: protectedProcedure
    .input(
      z.object({
        businessProfileId: z.number(),
        research: z.record(z.string(), z.unknown()),
        ttl: z.number().default(86400), // 24 hours
      })
    )
    .mutation(async ({ input }) => {
      // Placeholder: In production, store in cache/database
      return {
        success: true,
        cacheKey: `research_${input.businessProfileId}_${Date.now()}`,
      };
    }),
});

/**
 * Build research prompt with parameters
 */
function buildResearchPrompt(input: {
  businessName: string;
  industry: string;
  marketSize: string;
  targetAudience: string;
  competitorAnalysis: boolean;
  regulatoryLandscape: boolean;
}): string {
  let prompt = `Conduct a comprehensive business research analysis for:

Business Name: ${input.businessName}
Industry: ${input.industry}
Market Size Category: ${input.marketSize}
Target Audience: ${input.targetAudience}

Please provide:
1. Market Analysis: Current market size, growth trends, and opportunities
2. Target Audience Analysis: Demographics, needs, and pain points`;

  if (input.competitorAnalysis) {
    prompt += `
3. Competitor Analysis: Key competitors, their strengths/weaknesses, and market positioning`;
  }

  if (input.regulatoryLandscape) {
    prompt += `
4. Regulatory Landscape: Relevant regulations, compliance requirements, and industry standards`;
  }

  prompt += `
5. Strategic Recommendations: Top 5 actionable recommendations
6. Risk Factors: Key risks and mitigation strategies

Provide detailed, data-driven insights.`;

  return prompt;
}
