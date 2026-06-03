/**
 * Advanced Parameter Refinement Engine
 * Extracts complex parameters from voice commands using pattern matching and NLP
 */

export interface ExtractedParameters {
  dates?: {
    start?: Date;
    end?: Date;
    relative?: string;
  };
  amounts?: {
    value: number;
    currency: string;
  }[];
  recipients?: string[];
  keywords?: string[];
  entities?: Record<string, any>;
}

/**
 * Extract date references from text
 * Supports: "today", "tomorrow", "next week", "last 7 days", "2026-06-04", etc.
 */
export function extractDates(text: string): ExtractedParameters['dates'] {
  const result: ExtractedParameters['dates'] = {};
  const lowerText = text.toLowerCase();

  // Relative dates
  if (lowerText.includes('today')) {
    result.start = new Date();
    result.start.setHours(0, 0, 0, 0);
    result.end = new Date();
    result.end.setHours(23, 59, 59, 999);
    result.relative = 'today';
  } else if (lowerText.includes('tomorrow')) {
    result.start = new Date();
    result.start.setDate(result.start.getDate() + 1);
    result.start.setHours(0, 0, 0, 0);
    result.end = new Date(result.start);
    result.end.setHours(23, 59, 59, 999);
    result.relative = 'tomorrow';
  } else if (lowerText.includes('yesterday')) {
    result.start = new Date();
    result.start.setDate(result.start.getDate() - 1);
    result.start.setHours(0, 0, 0, 0);
    result.end = new Date(result.start);
    result.end.setHours(23, 59, 59, 999);
    result.relative = 'yesterday';
  } else if (lowerText.includes('this week')) {
    result.start = new Date();
    result.start.setDate(result.start.getDate() - result.start.getDay());
    result.start.setHours(0, 0, 0, 0);
    result.end = new Date();
    result.end.setHours(23, 59, 59, 999);
    result.relative = 'this_week';
  } else if (lowerText.includes('last week')) {
    result.start = new Date();
    result.start.setDate(result.start.getDate() - result.start.getDay() - 7);
    result.start.setHours(0, 0, 0, 0);
    result.end = new Date();
    result.end.setDate(result.end.getDate() - result.end.getDay());
    result.end.setHours(23, 59, 59, 999);
    result.relative = 'last_week';
  } else if (lowerText.includes('this month')) {
    result.start = new Date();
    result.start.setDate(1);
    result.start.setHours(0, 0, 0, 0);
    result.end = new Date();
    result.end.setHours(23, 59, 59, 999);
    result.relative = 'this_month';
  }

  // Relative time ranges: "last 7 days", "past 30 days", etc.
  const rangeMatch = text.match(/(?:last|past)\s+(\d+)\s+(days?|weeks?|months?)/i);
  if (rangeMatch) {
    const amount = parseInt(rangeMatch[1]);
    const unit = rangeMatch[2].toLowerCase();

    result.end = new Date();
    result.end.setHours(23, 59, 59, 999);

    result.start = new Date();
    if (unit.startsWith('day')) {
      result.start.setDate(result.start.getDate() - amount);
    } else if (unit.startsWith('week')) {
      result.start.setDate(result.start.getDate() - amount * 7);
    } else if (unit.startsWith('month')) {
      result.start.setMonth(result.start.getMonth() - amount);
    }
    result.start.setHours(0, 0, 0, 0);
    result.relative = `last_${amount}_${unit}`;
  }

  // ISO date format: "2026-06-04"
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    result.start = new Date(isoMatch[0]);
    result.start.setHours(0, 0, 0, 0);
    result.end = new Date(result.start);
    result.end.setHours(23, 59, 59, 999);
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Extract monetary amounts from text
 * Supports: "$100", "100 dollars", "€50", "50 EUR", etc.
 */
export function extractAmounts(text: string): ExtractedParameters['amounts'] {
  const amounts: ExtractedParameters['amounts'] = [];

  // Currency symbol patterns: $, €, £, ¥, etc.
  const currencySymbolMatch = text.match(/([€£¥₹$₽])(\d+(?:[.,]\d{2})?)/g);
  if (currencySymbolMatch) {
    currencySymbolMatch.forEach((match) => {
      const symbolMatch = match.match(/([€£¥₹$₽])(\d+(?:[.,]\d{2})?)/);
      if (symbolMatch) {
        const symbol = symbolMatch[1];
        const value = parseFloat(symbolMatch[2].replace(',', '.'));
        const currencyMap: Record<string, string> = {
          $: 'USD',
          '€': 'EUR',
          '£': 'GBP',
          '¥': 'JPY',
          '₹': 'INR',
          '₽': 'RUB',
        };

        amounts.push({
          value,
          currency: currencyMap[symbol] || 'USD',
        });
      }
    });
  }

  // Text-based currency patterns: "100 dollars", "50 euros", etc.
  const textCurrencyMatch = text.match(/(\d+(?:[.,]\d{2})?)\s+(dollars?|euros?|pounds?|yen|rupees?|rubles?)/gi);
  if (textCurrencyMatch) {
    textCurrencyMatch.forEach((match) => {
      const parts = match.match(/(\d+(?:[.,]\d{2})?)\s+(\w+)/i);
      if (parts) {
        const value = parseFloat(parts[1].replace(',', '.'));
        const currencyText = parts[2].toLowerCase();
        const currencyMap: Record<string, string> = {
          dollar: 'USD',
          dollars: 'USD',
          euro: 'EUR',
          euros: 'EUR',
          pound: 'GBP',
          pounds: 'GBP',
          yen: 'JPY',
          rupee: 'INR',
          rupees: 'INR',
          ruble: 'RUB',
          rubles: 'RUB',
        };

        amounts.push({
          value,
          currency: currencyMap[currencyText] || 'USD',
        });
      }
    });
  }

  // ISO currency codes: "100 USD", "50 EUR", etc.
  const isoCurrencyMatch = text.match(/(\d+(?:[.,]\d{2})?)\s+([A-Z]{3})/g);
  if (isoCurrencyMatch) {
    isoCurrencyMatch.forEach((match) => {
      const parts = match.match(/(\d+(?:[.,]\d{2})?)\s+([A-Z]{3})/);
      if (parts) {
        amounts.push({
          value: parseFloat(parts[1].replace(',', '.')),
          currency: parts[2],
        });
      }
    });
  }

  return amounts.length > 0 ? amounts : undefined;
}

/**
 * Extract recipient/email addresses from text
 * Supports: "john@example.com", "send to john and jane", etc.
 */
export function extractRecipients(text: string): ExtractedParameters['recipients'] {
  const recipients: string[] = [];

  // Email addresses
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
  if (emailMatch) {
    recipients.push(...emailMatch);
  }

  // Names after "to", "send to", "for", etc.
  const nameMatch = text.match(/(?:to|send to|for)\s+([A-Za-z\s,and]+?)(?:\s+and|\s+,|$)/gi);
  if (nameMatch) {
    nameMatch.forEach((match) => {
      const names = match
        .replace(/^(?:to|send to|for)\s+/i, '')
        .split(/\s+and\s+|,\s*/);
      recipients.push(
        ...names
          .map((n) => n.trim())
          .filter((n) => n.length > 0 && !n.match(/^\d+$/))
      );
    });
  }

  return recipients.length > 0 ? recipients : undefined;
}

/**
 * Extract keywords/tags from text
 * Supports: "#hashtag", "tag:value", quoted phrases, etc.
 */
export function extractKeywords(text: string): ExtractedParameters['keywords'] {
  const keywords: string[] = [];

  // Hashtags
  const hashtagMatch = text.match(/#\w+/g);
  if (hashtagMatch) {
    keywords.push(...hashtagMatch.map((h) => h.substring(1)));
  }

  // Quoted phrases
  const quotedMatch = text.match(/"([^"]+)"/g);
  if (quotedMatch) {
    keywords.push(...quotedMatch.map((q) => q.slice(1, -1)));
  }

  // Tag:value patterns
  const tagMatch = text.match(/(\w+):([^\s,]+)/g);
  if (tagMatch) {
    keywords.push(...tagMatch);
  }

  return keywords.length > 0 ? keywords : undefined;
}

/**
 * Main function to extract all parameters from voice command text
 */
export function refineCommandParameters(text: string): ExtractedParameters {
  return {
    dates: extractDates(text),
    amounts: extractAmounts(text),
    recipients: extractRecipients(text),
    keywords: extractKeywords(text),
  };
}

/**
 * Format extracted parameters for display
 */
export function formatExtractedParameters(params: ExtractedParameters): string {
  const parts: string[] = [];

  if (params.dates) {
    if (params.dates.relative) {
      parts.push(`📅 ${params.dates.relative}`);
    } else if (params.dates.start && params.dates.end) {
      parts.push(`📅 ${params.dates.start.toLocaleDateString()} to ${params.dates.end.toLocaleDateString()}`);
    }
  }

  if (params.amounts) {
    parts.push(
      ...params.amounts.map((a) => `💰 ${a.value} ${a.currency}`)
    );
  }

  if (params.recipients) {
    parts.push(`👥 Recipients: ${params.recipients.join(', ')}`);
  }

  if (params.keywords) {
    parts.push(`🏷️ Tags: ${params.keywords.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'No parameters extracted';
}
