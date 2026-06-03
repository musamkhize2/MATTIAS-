import { useRef, useCallback, useState } from 'react';

export interface VoiceFeedbackState {
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseVoiceFeedbackReturn extends VoiceFeedbackState {
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export interface SpeechOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  lang?: string; // BCP 47 language tag, default 'en-US'
}

/**
 * Hook for text-to-speech feedback using Web Speech API
 * Provides voice feedback for command execution and results
 */
export function useVoiceFeedback(): UseVoiceFeedbackReturn {
  const [state, setState] = useState<VoiceFeedbackState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const speak = useCallback(
    async (text: string, options: SpeechOptions = {}) => {
      return new Promise<void>((resolve, reject) => {
        try {
          if (!synth) {
            setState((prev) => ({
              ...prev,
              error: 'Speech synthesis not supported in this browser',
            }));
            reject(new Error('Speech synthesis not supported'));
            return;
          }

          // Cancel any ongoing speech
          synth.cancel();

          // Create utterance
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = options.rate ?? 1;
          utterance.pitch = options.pitch ?? 1;
          utterance.volume = options.volume ?? 1;
          utterance.lang = options.lang ?? 'en-US';

          utteranceRef.current = utterance;

          // Handle speech start
          utterance.onstart = () => {
            setState((prev) => ({
              ...prev,
              isSpeaking: true,
              isLoading: false,
              error: null,
            }));
          };

          // Handle speech end
          utterance.onend = () => {
            setState((prev) => ({
              ...prev,
              isSpeaking: false,
              isLoading: false,
            }));
            resolve();
          };

          // Handle errors
          utterance.onerror = (event) => {
            const errorMessage = `Speech synthesis error: ${event.error}`;
            setState((prev) => ({
              ...prev,
              isSpeaking: false,
              isLoading: false,
              error: errorMessage,
            }));
            reject(new Error(errorMessage));
          };

          // Start speaking
          setState((prev) => ({ ...prev, isLoading: true }));
          synth.speak(utterance);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to speak';
          setState((prev) => ({
            ...prev,
            isSpeaking: false,
            isLoading: false,
            error: errorMessage,
          }));
          reject(error);
        }
      });
    },
    [synth]
  );

  const stop = useCallback(() => {
    if (synth) {
      synth.cancel();
      setState((prev) => ({
        ...prev,
        isSpeaking: false,
        isLoading: false,
      }));
    }
  }, [synth]);

  const pause = useCallback(() => {
    if (synth && synth.paused === false) {
      synth.pause();
    }
  }, [synth]);

  const resume = useCallback(() => {
    if (synth && synth.paused === true) {
      synth.resume();
    }
  }, [synth]);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
  };
}

/**
 * Format command execution result for voice feedback
 */
export function formatVoiceFeedback(
  action: string,
  result: any,
  success: boolean
): string {
  if (!success) {
    return `Command failed. ${result?.error || 'Please try again.'}`;
  }

  const feedbackMap: Record<string, (r: any) => string> = {
    createCampaign: (r) =>
      `Campaign "${r.name}" created successfully. Ready to send.`,
    sendCampaign: (r) =>
      `Campaign sent to ${r.recipientCount || 0} recipients. Delivery in progress.`,
    listCampaigns: (r) =>
      `Found ${r.campaigns?.length || 0} campaigns. ${r.campaigns?.length > 0 ? `Top campaign is "${r.campaigns[0].name}".` : ''}`,
    getAnalytics: (r) =>
      `Analytics: ${r.totalSent || 0} sent, ${r.opened || 0} opened, ${r.clicked || 0} clicked.`,
    getCampaignPerformance: (r) =>
      `Top campaign is "${r.topCampaign?.name || 'N/A'}" with ${r.topCampaign?.openRate || 0} percent open rate.`,
    listCompanies: (r) =>
      `Found ${r.companies?.length || 0} companies. ${r.companies?.length > 0 ? `Top company is "${r.companies[0].name}".` : ''}`,
    createCompany: (r) =>
      `Company "${r.name}" created successfully. Now active.`,
    listApprovals: (r) =>
      `Found ${r.approvals?.length || 0} pending approvals. ${r.approvals?.length > 0 ? 'Ready for review.' : 'All caught up!'}`,
    approveRequest: (r) => `Request approved successfully. Proceeding with execution.`,
    rejectRequest: (r) => `Request rejected. Changes have been discarded.`,
    navigateDashboard: (r) =>
      `Navigating to ${r.section || 'dashboard'}. Loading now.`,
    showHelp: (r) => `Here are the available voice commands. Say any command to execute it.`,
  };

  const formatter = feedbackMap[action];
  return formatter ? formatter(result) : 'Command executed successfully.';
}

/**
 * Generate voice feedback for command parsing
 */
export function generateParsingFeedback(
  command: string | null,
  confidence: number
): string {
  if (!command) {
    return 'Sorry, I did not understand that command. Please try again or say help for available commands.';
  }

  if (confidence < 0.7) {
    return `I think you said ${command}, but I am not sure. Please repeat or clarify.`;
  }

  return `Understood. Executing ${command}.`;
}

/**
 * Generate voice feedback for extracted parameters
 */
export function generateParameterFeedback(
  dates?: { relative?: string; start?: Date; end?: Date },
  amounts?: Array<{ value: number; currency: string }>,
  recipients?: string[],
  keywords?: string[]
): string {
  const parts: string[] = [];

  if (dates?.relative) {
    parts.push(`for ${dates.relative}`);
  }

  if (amounts && amounts.length > 0) {
    parts.push(
      `amount ${amounts.map((a) => `${a.value} ${a.currency}`).join(' and ')}`
    );
  }

  if (recipients && recipients.length > 0) {
    parts.push(`to ${recipients.join(' and ')}`);
  }

  if (keywords && keywords.length > 0) {
    parts.push(`with tags ${keywords.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'Parameters extracted.';
  }

  return `Extracted: ${parts.join(', ')}.`;
}
