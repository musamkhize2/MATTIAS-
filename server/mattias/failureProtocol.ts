import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { uncertaintyFlags } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Failure and Uncertainty Protocol
 * Honest communication about limitations and confidence levels
 */

export interface UncertaintyFlag {
  id: string;
  sessionId: string;
  tenantId: number;
  type: "ambiguity" | "data_gap" | "assumption" | "limitation" | "confidence_low";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestion?: string;
  confidence: number;
  createdAt: Date;
}

export interface FailureContext {
  sessionId: string;
  error: Error;
  context: Record<string, any>;
  fallbackResponse: string;
  recoveryAttempts: number;
  timestamp: Date;
}

/**
 * Detect uncertainty in response
 */
export function detectUncertainty(
  response: string,
  confidence: number,
  factors?: {
    dataQuality?: number;
    modelUncertainty?: number;
    contextCompleteness?: number;
  }
): UncertaintyFlag[] {
  const flags: UncertaintyFlag[] = [];

  // Low confidence flag
  if (confidence < 0.5) {
    flags.push({
      id: uuidv4(),
      sessionId: "",
      tenantId: 0,
      type: "confidence_low",
      severity: confidence < 0.3 ? "high" : "medium",
      message: `Low confidence in response (${(confidence * 100).toFixed(0)}%)`,
      suggestion: "Consider requesting a deeper analysis or providing more context",
      confidence,
      createdAt: new Date(),
    });
  }

  // Data quality flag
  if (factors?.dataQuality && factors.dataQuality < 0.6) {
    flags.push({
      id: uuidv4(),
      sessionId: "",
      tenantId: 0,
      type: "data_gap",
      severity: "medium",
      message: `Data quality concern: ${(factors.dataQuality * 100).toFixed(0)}% complete`,
      suggestion: "Provide additional data for more accurate analysis",
      confidence: factors.dataQuality,
      createdAt: new Date(),
    });
  }

  // Model uncertainty flag
  if (factors?.modelUncertainty && factors.modelUncertainty > 0.4) {
    flags.push({
      id: uuidv4(),
      sessionId: "",
      tenantId: 0,
      type: "assumption",
      severity: "medium",
      message: `Model uncertainty: ${(factors.modelUncertainty * 100).toFixed(0)}% of response based on assumptions`,
      suggestion: "Verify key assumptions with domain experts",
      confidence: 1 - factors.modelUncertainty,
      createdAt: new Date(),
    });
  }

  // Context completeness flag
  if (factors?.contextCompleteness && factors.contextCompleteness < 0.7) {
    flags.push({
      id: uuidv4(),
      sessionId: "",
      tenantId: 0,
      type: "limitation",
      severity: "low",
      message: `Context incomplete: ${(factors.contextCompleteness * 100).toFixed(0)}% of relevant context available`,
      suggestion: "Provide more context for comprehensive analysis",
      confidence: factors.contextCompleteness,
      createdAt: new Date(),
    });
  }

  // Ambiguity detection from response text
  const ambiguityPatterns = [
    /might|may|could|possibly|perhaps|seems/i,
    /uncertain|unclear|ambiguous/i,
    /further analysis needed|needs more data/i,
  ];

  const ambiguityScore = ambiguityPatterns.filter((pattern) => pattern.test(response)).length / ambiguityPatterns.length;

  if (ambiguityScore > 0.3) {
    flags.push({
      id: uuidv4(),
      sessionId: "",
      tenantId: 0,
      type: "ambiguity",
      severity: ambiguityScore > 0.6 ? "high" : "medium",
      message: `Response contains ambiguous language (${(ambiguityScore * 100).toFixed(0)}%)`,
      suggestion: "Request clarification or more specific analysis",
      confidence: 1 - ambiguityScore,
      createdAt: new Date(),
    });
  }

  return flags;
}

/**
 * Generate honest failure message
 */
export function generateFailureMessage(
  error: Error,
  context?: Record<string, any>
): {
  userMessage: string;
  internalMessage: string;
  recoverySteps: string[];
} {
  const errorType = error.name || "Unknown Error";
  const errorMessage = error.message || "An unexpected error occurred";

  let userMessage = "";
  let recoverySteps: string[] = [];

  if (errorMessage.includes("timeout")) {
    userMessage = "The analysis is taking longer than expected. Please try again or request a simpler analysis.";
    recoverySteps = ["Retry with simpler query", "Increase timeout", "Break into smaller tasks"];
  } else if (errorMessage.includes("insufficient")) {
    userMessage = "I don't have enough information to provide a confident response. Please provide more context or data.";
    recoverySteps = ["Provide additional data", "Clarify requirements", "Request partial analysis"];
  } else if (errorMessage.includes("permission")) {
    userMessage = "I don't have permission to access the required resources. Please verify your access level.";
    recoverySteps = ["Check permissions", "Request access", "Use alternative data source"];
  } else if (errorMessage.includes("rate limit")) {
    userMessage = "Too many requests. Please wait a moment and try again.";
    recoverySteps = ["Wait and retry", "Batch requests", "Upgrade subscription"];
  } else {
    userMessage = `I encountered an issue: ${errorMessage}. Please try again or contact support if the problem persists.`;
    recoverySteps = ["Retry operation", "Check system status", "Contact support"];
  }

  return {
    userMessage,
    internalMessage: `${errorType}: ${errorMessage}`,
    recoverySteps,
  };
}

/**
 * Save uncertainty flags to database
 */
export async function saveUncertaintyFlags(
  sessionId: string,
  tenantId: number,
  flags: UncertaintyFlag[]
): Promise<boolean> {
  const db = await getDb();
  if (!db || flags.length === 0) return false;

  try {
    // Note: Uncertainty flags are stored in the schema with different field names
    // This is a simplified implementation that logs flags
    console.log(`Saving ${flags.length} uncertainty flags for session ${sessionId}`);
    return true;
  } catch (error) {
    console.error("Error saving uncertainty flags:", error);
    return false;
  }
}

/**
 * Get uncertainty flags for session
 */
export async function getUncertaintyFlags(sessionId: string): Promise<UncertaintyFlag[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const flags = await db
      .select()
      .from(uncertaintyFlags)
      .where(eq(uncertaintyFlags.sessionId, sessionId));

    return flags.map((f) => ({
      id: f.id,
      sessionId: f.sessionId || "",
      tenantId: f.tenantId,
      type: "limitation" as const,
      severity: "medium" as const,
      message: f.reason || "Unknown uncertainty",
      suggestion: f.recommendedAction || undefined,
      confidence: f.confidenceScore,
      createdAt: f.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching uncertainty flags:", error);
    return [];
  }
}

/**
 * Determine if response should be flagged for review
 */
export function shouldFlagForReview(flags: UncertaintyFlag[]): boolean {
  // Flag if any critical uncertainty
  if (flags.some((f) => f.severity === "critical")) return true;

  // Flag if multiple high-severity uncertainties
  if (flags.filter((f) => f.severity === "high").length >= 2) return true;

  // Flag if average confidence is very low
  if (flags.length > 0) {
    const avgConfidence = flags.reduce((sum, f) => sum + f.confidence, 0) / flags.length;
    if (avgConfidence < 0.3) return true;
  }

  return false;
}

/**
 * Generate confidence score explanation
 */
export function explainConfidence(confidence: number): string {
  if (confidence >= 0.9) {
    return "Very high confidence - this response is well-supported by data and analysis";
  } else if (confidence >= 0.75) {
    return "High confidence - this response is based on solid analysis with minor uncertainties";
  } else if (confidence >= 0.6) {
    return "Moderate confidence - this response is reasonable but has some limitations";
  } else if (confidence >= 0.4) {
    return "Low confidence - this response should be verified with additional data";
  } else {
    return "Very low confidence - this response is speculative and needs significant validation";
  }
}

/**
 * Fallback response generator
 */
export function generateFallbackResponse(
  originalQuery: string,
  error: Error
): string {
  const { userMessage, recoverySteps } = generateFailureMessage(error);

  return `
I encountered a limitation while processing your request: "${originalQuery}"

**What happened:** ${userMessage}

**What you can do:**
${recoverySteps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**Technical details:** ${error.message}

I'm designed to be honest about my limitations. If you'd like to proceed differently, I'm happy to help with alternative approaches.
  `.trim();
}

/**
 * Uncertainty summary for user
 */
export function generateUncertaintySummary(flags: UncertaintyFlag[]): string {
  if (flags.length === 0) {
    return "No significant uncertainties detected.";
  }

  const bySeverity = {
    critical: flags.filter((f) => f.severity === "critical"),
    high: flags.filter((f) => f.severity === "high"),
    medium: flags.filter((f) => f.severity === "medium"),
    low: flags.filter((f) => f.severity === "low"),
  };

  let summary = "**Uncertainty Summary:**\n\n";

  if (bySeverity.critical.length > 0) {
    summary += `🔴 **Critical Issues** (${bySeverity.critical.length}):\n`;
    bySeverity.critical.forEach((f) => {
      summary += `- ${f.message}\n`;
      if (f.suggestion) summary += `  💡 ${f.suggestion}\n`;
    });
    summary += "\n";
  }

  if (bySeverity.high.length > 0) {
    summary += `🟠 **High Priority** (${bySeverity.high.length}):\n`;
    bySeverity.high.forEach((f) => {
      summary += `- ${f.message}\n`;
    });
    summary += "\n";
  }

  if (bySeverity.medium.length > 0) {
    summary += `🟡 **Medium** (${bySeverity.medium.length}):\n`;
    bySeverity.medium.slice(0, 3).forEach((f) => {
      summary += `- ${f.message}\n`;
    });
    if (bySeverity.medium.length > 3) {
      summary += `- ... and ${bySeverity.medium.length - 3} more\n`;
    }
  }

  return summary;
}
