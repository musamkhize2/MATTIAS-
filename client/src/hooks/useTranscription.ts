import { useState, useCallback } from 'react';

export interface TranscriptionState {
  isTranscribing: boolean;
  transcript: string | null;
  error: string | null;
  progress: number; // 0-100
}

export interface UseTranscriptionReturn extends TranscriptionState {
  transcribeAudio: (audioBlob: Blob) => Promise<string>;
  clearTranscript: () => void;
}

/**
 * Hook for transcribing audio using the server-side Whisper API
 * Handles audio upload, transcription, and error management
 */
export function useTranscription(): UseTranscriptionReturn {
  const [state, setState] = useState<TranscriptionState>({
    isTranscribing: false,
    transcript: null,
    error: null,
    progress: 0,
  });

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        setState((prev) => ({
          ...prev,
          isTranscribing: true,
          error: null,
          progress: 0,
        }));

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', 'en');

        // Upload and transcribe
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 50); // First 50% for upload
            setState((prev) => ({ ...prev, progress: percentComplete }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              const transcript = response.text || response.transcript || '';

              setState((prev) => ({
                ...prev,
                isTranscribing: false,
                transcript,
                progress: 100,
              }));

              resolve(transcript);
            } catch (error) {
              const errorMsg = 'Failed to parse transcription response';
              setState((prev) => ({
                ...prev,
                isTranscribing: false,
                error: errorMsg,
              }));
              reject(new Error(errorMsg));
            }
          } else {
            const errorMsg = `Transcription failed: ${xhr.statusText}`;
            setState((prev) => ({
              ...prev,
              isTranscribing: false,
              error: errorMsg,
            }));
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener('error', () => {
          const errorMsg = 'Network error during transcription';
          setState((prev) => ({
            ...prev,
            isTranscribing: false,
            error: errorMsg,
          }));
          reject(new Error(errorMsg));
        });

        xhr.addEventListener('abort', () => {
          const errorMsg = 'Transcription cancelled';
          setState((prev) => ({
            ...prev,
            isTranscribing: false,
            error: errorMsg,
          }));
          reject(new Error(errorMsg));
        });

        xhr.open('POST', '/api/transcribe');
        xhr.send(formData);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Transcription failed';
        setState((prev) => ({
          ...prev,
          isTranscribing: false,
          error: errorMsg,
        }));
        reject(error);
      }
    });
  }, []);

  const clearTranscript = useCallback(() => {
    setState({
      isTranscribing: false,
      transcript: null,
      error: null,
      progress: 0,
    });
  }, []);

  return {
    ...state,
    transcribeAudio,
    clearTranscript,
  };
}
