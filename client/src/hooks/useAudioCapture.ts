import { useState, useRef, useCallback } from 'react';

export interface AudioCaptureState {
  isRecording: boolean;
  isProcessing: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  error: string | null;
}

export interface UseAudioCaptureReturn extends AudioCaptureState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  clearAudio: () => void;
}

/**
 * Hook for capturing audio using MediaRecorder API
 * Handles browser permissions, recording state, and blob conversion
 */
export function useAudioCapture(): UseAudioCaptureReturn {
  const [state, setState] = useState<AudioCaptureState>({
    isRecording: false,
    isProcessing: false,
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder with appropriate MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        setState((prev) => ({
          ...prev,
          isRecording: false,
          isProcessing: false,
          audioBlob,
          audioUrl,
        }));

        // Clean up stream
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start();
      startTimeRef.current = Date.now();

      // Track duration
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, duration: elapsed }));
      }, 100);

      setState((prev) => ({ ...prev, isRecording: true }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to access microphone';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
      }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && state.isRecording) {
        setState((prev) => ({ ...prev, isProcessing: true }));

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || 'audio/webm',
          });
          const audioUrl = URL.createObjectURL(audioBlob);

          setState((prev) => ({
            ...prev,
            isRecording: false,
            isProcessing: false,
            audioBlob,
            audioUrl,
          }));

          // Clean up stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          // Clear duration interval
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }

          resolve();
        };

        mediaRecorderRef.current.stop();
      } else {
        resolve();
      }
    });
  }, [state.isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setState({
        isRecording: false,
        isProcessing: false,
        audioBlob: null,
        audioUrl: null,
        duration: 0,
        error: null,
      });
    }
  }, [state.isRecording]);

  const clearAudio = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      isProcessing: false,
      audioBlob: null,
      audioUrl: null,
      duration: 0,
      error: null,
    });
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
  };
}
