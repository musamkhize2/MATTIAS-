/**
 * Voice Command Confidence Scoring System
 * Evaluates command parsing confidence and requires user confirmation for low-confidence commands
 */

export interface ConfidenceScore {
  overall: number; // 0-1
  parsing: number; // 0-1
  parameters: number; // 0-1
  context: number; // 0-1
  factors: string[];
}

export interface ConfidenceResult {
  score: ConfidenceScore;
  requiresConfirmation: boolean;
  confirmationPrompt: string;
  suggestedAlternatives: string[];
}

/**
 * Calculate parsing confidence based on command structure
 */
export function calculateParsingConfidence(
  text: string,
  commandAction: string | null
): number {
  if (!commandAction) return 0; // No command recognized

  let confidence = 0.5; // Base confidence

  // Boost for clear command keywords
  const clearKeywords = [
    'create',
    'send',
    'list',
    'get',
    'approve',
    'reject',
    'delete',
    'update',
  ];
  if (clearKeywords.some((kw) => text.toLowerCase().includes(kw))) {
    confidence += 0.2;
  }

  // Boost for specific identifiers (IDs, emails)
  if (/\d+/.test(text) || /@/.test(text)) {
    confidence += 0.15;
  }

  // Penalize for ambiguous language
  if (text.toLowerCase().includes('maybe') || text.toLowerCase().includes('possibly')) {
    confidence -= 0.2;
  }

  // Penalize for very short input
  if (text.length < 10) {
    confidence -= 0.1;
  }

  return Math.min(1, Math.max(0, confidence));
}

/**
 * Calculate parameter extraction confidence
 */
export function calculateParameterConfidence(
  extractedParams: Record<string, any>
): number {
  let confidence = 0.7; // Base confidence

  const paramCount = Object.values(extractedParams).filter((v) => v !== undefined).length;

  // Boost for multiple extracted parameters
  if (paramCount >= 2) {
    confidence += 0.15;
  } else if (paramCount === 0) {
    confidence -= 0.2;
  }

  // Boost for specific parameter types
  if (extractedParams.recipients && extractedParams.recipients.length > 0) {
    confidence += 0.1;
  }

  if (extractedParams.amounts && extractedParams.amounts.length > 0) {
    confidence += 0.1;
  }

  if (extractedParams.dates && extractedParams.dates.start) {
    confidence += 0.1;
  }

  return Math.min(1, Math.max(0, confidence));
}

/**
 * Calculate context-based confidence
 */
export function calculateContextConfidence(
  commandAction: string,
  userHistory: Array<{ action: string; timestamp: Date }>
): number {
  let confidence = 0.6;

  // Boost for repeated commands
  const recentSimilarCommands = userHistory.filter(
    (h) =>
      h.action === commandAction &&
      Date.now() - h.timestamp.getTime() < 3600000 // Last hour
  ).length;

  if (recentSimilarCommands > 0) {
    confidence += Math.min(0.2, recentSimilarCommands * 0.05);
  }

  return Math.min(1, Math.max(0, confidence));
}

/**
 * Calculate overall confidence score
 */
export function calculateConfidenceScore(
  text: string,
  commandAction: string | null,
  extractedParams: Record<string, any>,
  userHistory: Array<{ action: string; timestamp: Date }> = []
): ConfidenceScore {
  const parsing = calculateParsingConfidence(text, commandAction);
  const parameters = calculateParameterConfidence(extractedParams);
  const context = calculateContextConfidence(commandAction || '', userHistory);

  // Weighted average
  const overall = parsing * 0.4 + parameters * 0.35 + context * 0.25;

  const factors: string[] = [];

  if (parsing < 0.6) factors.push('Low parsing confidence');
  if (parameters < 0.6) factors.push('Incomplete parameters');
  if (context < 0.6) factors.push('Unusual command pattern');
  if (text.length < 15) factors.push('Brief input');

  return {
    overall: Math.round(overall * 100) / 100,
    parsing: Math.round(parsing * 100) / 100,
    parameters: Math.round(parameters * 100) / 100,
    context: Math.round(context * 100) / 100,
    factors,
  };
}

/**
 * Generate confidence-based result with confirmation requirements
 */
export function evaluateConfidence(
  text: string,
  commandAction: string | null,
  extractedParams: Record<string, any>,
  userHistory: Array<{ action: string; timestamp: Date }> = [],
  confidenceThreshold: number = 0.8
): ConfidenceResult {
  const score = calculateConfidenceScore(text, commandAction, extractedParams, userHistory);
  const requiresConfirmation = score.overall < confidenceThreshold;

  let confirmationPrompt = '';
  const suggestedAlternatives: string[] = [];

  if (requiresConfirmation) {
    confirmationPrompt = `I'm ${Math.round(score.overall * 100)}% confident I understood: "${commandAction}". `;

    if (score.factors.length > 0) {
      confirmationPrompt += `Concerns: ${score.factors.join(', ')}. `;
    }

    confirmationPrompt += 'Say "yes" to confirm or "no" to try again.';

    // Generate alternatives based on confidence factors
    if (score.parsing < 0.6) {
      suggestedAlternatives.push('Try being more specific with action keywords');
    }
    if (score.parameters < 0.6) {
      suggestedAlternatives.push('Include more details like recipient, amount, or date');
    }
    if (score.context < 0.6) {
      suggestedAlternatives.push('This is an unusual command pattern for you');
    }
  }

  return {
    score,
    requiresConfirmation,
    confirmationPrompt,
    suggestedAlternatives,
  };
}

/**
 * Generate voice feedback for confidence evaluation
 */
export function generateConfidenceFeedback(result: ConfidenceResult): string {
  if (!result.requiresConfirmation) {
    return `Understood with ${Math.round(result.score.overall * 100)}% confidence.`;
  }

  return result.confirmationPrompt;
}

/**
 * Confidence-based command execution strategy
 */
export function getExecutionStrategy(score: ConfidenceScore): 'execute' | 'confirm' | 'reject' {
  if (score.overall >= 0.9) {
    return 'execute'; // High confidence - execute immediately
  } else if (score.overall >= 0.7) {
    return 'confirm'; // Medium confidence - ask for confirmation
  } else {
    return 'reject'; // Low confidence - reject and ask for clarification
  }
}

/**
 * Format confidence score for display
 */
export function formatConfidenceDisplay(score: ConfidenceScore): string {
  const overallPercent = Math.round(score.overall * 100);
  const parsingPercent = Math.round(score.parsing * 100);
  const paramsPercent = Math.round(score.parameters * 100);
  const contextPercent = Math.round(score.context * 100);

  return (
    `📊 Confidence: ${overallPercent}% ` +
    `(Parsing: ${parsingPercent}% | Params: ${paramsPercent}% | Context: ${contextPercent}%)`
  );
}
