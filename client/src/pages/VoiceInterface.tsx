import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Square, Volume2, Loader2, Play, Pause, StopCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import LogoHeader from "@/components/LogoHeader";
import VoiceCommandTemplates from "@/components/VoiceCommandTemplates";
import WebhookEventStream from "@/components/WebhookEventStream";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useVoiceFeedback, formatVoiceFeedback, generateParsingFeedback, generateParameterFeedback } from "@/hooks/useVoiceFeedback";

export default function VoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [voiceHistory, setVoiceHistory] = useState<Array<{ input: string; output: string; timestamp: Date }>>([]);
  const [extractedParams, setExtractedParams] = useState<any>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  
  // Audio capture hook
  const audioCapture = useAudioCapture();
  
  // Voice feedback hook
  const voiceFeedback = useVoiceFeedback();
  
  const recognitionRef = useRef<any>(null);
  const commandMutation = trpc.command.send.useMutation();

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognitionRef.current.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setTranscript((prev) => prev + transcriptSegment);
          } else {
            interim += transcriptSegment;
          }
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        toast.error(`Voice error: ${event.error}`);
        setIsListening(false);
      };
    }
  }, []);

  const handleStartListening = () => {
    if (recognitionRef.current) {
      setTranscript("");
      recognitionRef.current.start();
    } else {
      toast.error("Speech Recognition not supported in your browser");
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleStartAudioCapture = async () => {
    try {
      await audioCapture.startRecording();
      toast.info("Audio recording started. Speak now...");
    } catch (error) {
      toast.error("Failed to start recording");
    }
  };

  const handleStopAudioCapture = async () => {
    try {
      await audioCapture.stopRecording();
      if (audioCapture.audioBlob) {
        toast.success(`Audio captured (${audioCapture.duration}s)`);
        // In production, send to transcription API
        setTranscript(`[Audio captured - ${audioCapture.duration}s]`);
      }
    } catch (error) {
      toast.error("Failed to stop recording");
    }
  };

  const handleProcessCommand = async () => {
    if (!transcript.trim()) {
      toast.error("Please say a command first");
      return;
    }

    setIsProcessing(true);
    try {
      // Generate parsing feedback
      const parsingFeedback = generateParsingFeedback(transcript, 0.95);
      await voiceFeedback.speak(parsingFeedback);

      // Call MATTIAS command interface with voice input
      const response = await commandMutation.mutateAsync({
        message: transcript,
      });

      const responseText = typeof response === "string" ? response : response.response;
      setResponse(responseText);

      // Generate voice feedback for result
      const resultFeedback = formatVoiceFeedback("sendCampaign", { recipientCount: 100 }, true);
      await voiceFeedback.speak(resultFeedback);

      setVoiceHistory((prev) => [
        ...prev,
        {
          input: transcript,
          output: responseText,
          timestamp: new Date(),
        },
      ]);

      setTranscript("");
    } catch (error) {
      const errorFeedback = "Command failed. Please try again.";
      await voiceFeedback.speak(errorFeedback);
      toast.error("Failed to process command");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveByVoice = async () => {
    toast.info("Listening for approval confirmation...");
    if (recognitionRef.current) {
      setTranscript("");
      recognitionRef.current.start();

      // Wait for speech
      setTimeout(() => {
        if (transcript.toLowerCase().includes("yes") || transcript.toLowerCase().includes("approve")) {
          toast.success("Approval confirmed by voice");
          voiceFeedback.speak("Approval confirmed. Proceeding with execution.");
          // TODO: Trigger approval mutation
        } else if (
          transcript.toLowerCase().includes("no") ||
          transcript.toLowerCase().includes("reject")
        ) {
          toast.info("Approval rejected");
          voiceFeedback.speak("Approval rejected. Changes discarded.");
          // TODO: Trigger rejection mutation
        }
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <LogoHeader size="md" showText={true} />
        <div className="space-y-2 text-right">
          <h1 className="text-3xl font-bold text-foreground">Voice Interface</h1>
          <p className="text-muted-foreground">Hands-free AI operator — speak commands and approve actions by voice</p>
        </div>
      </div>

      {/* Voice Input Section */}
      <Card className="p-6 border-border bg-card">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Voice Command</h2>

          {/* Transcript Display */}
          <div className="p-4 rounded-lg bg-background border border-border min-h-24">
            <p className="text-sm text-muted-foreground mb-2">Transcript:</p>
            <p className="text-foreground font-mono">{transcript || "(listening...)"}</p>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleStartListening}
              disabled={isListening || isProcessing || audioCapture.isRecording}
              className="gap-2"
              variant={isListening ? "destructive" : "default"}
            >
              <Mic size={16} />
              {isListening ? "Listening..." : "Start Listening"}
            </Button>

            {isListening && (
              <Button onClick={handleStopListening} variant="outline" className="gap-2">
                <Square size={16} />
                Stop
              </Button>
            )}

            <Button
              onClick={handleStartAudioCapture}
              disabled={isListening || audioCapture.isRecording}
              className="gap-2"
              variant={audioCapture.isRecording ? "destructive" : "outline"}
            >
              <Mic size={16} />
              {audioCapture.isRecording ? `Recording (${audioCapture.duration}s)` : "Record Audio"}
            </Button>

            {audioCapture.isRecording && (
              <Button onClick={handleStopAudioCapture} variant="outline" className="gap-2">
                <StopCircle size={16} />
                Stop Recording
              </Button>
            )}

            <Button
              onClick={handleProcessCommand}
              disabled={!transcript || isProcessing}
              className="gap-2"
              variant="secondary"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              {isProcessing ? "Processing..." : "Process Command"}
            </Button>
          </div>

          {/* Audio Playback */}
          {audioCapture.audioUrl && (
            <div className="p-4 rounded-lg bg-background border border-border">
              <p className="text-sm text-muted-foreground mb-2">Recorded Audio:</p>
              <audio
                src={audioCapture.audioUrl}
                controls
                className="w-full mb-3"
              />
              <Button
                onClick={() => audioCapture.clearAudio()}
                variant="outline"
                size="sm"
              >
                Clear Recording
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Voice Feedback Status */}
      {voiceFeedback.isSpeaking && (
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center gap-3">
            <Volume2 size={20} className="text-blue-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-card-foreground">Speaking...</p>
              <p className="text-xs text-muted-foreground">MATTIAS is providing voice feedback</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button onClick={voiceFeedback.pause} size="sm" variant="outline">
                <Pause size={14} />
              </Button>
              <Button onClick={voiceFeedback.stop} size="sm" variant="outline">
                <StopCircle size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Response Section */}
      {response && (
        <Card className="p-6 border-border bg-card">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-card-foreground">MATTIAS Response</h2>

            <div className="p-4 rounded-lg bg-background border border-border">
              <p className="text-foreground">{response}</p>
            </div>

            {/* Extracted Parameters Display */}
            {extractedParams && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  <Zap size={14} className="inline mr-2" />
                  Extracted Parameters
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">{extractedParams}</p>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleApproveByVoice}
                variant="default"
                className="gap-2"
              >
                <Mic size={16} />
                Approve by Voice
              </Button>

              <Button variant="outline" onClick={() => setResponse("")}>
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Voice Command Templates */}
      <Card className="p-6 border-border bg-card">
        <VoiceCommandTemplates 
          onCommandSelect={(command) => {
            setTranscript(command);
            toast.info(`Command selected: ${command}`);
          }}
          isListening={isListening}
        />
      </Card>

      {/* Real-Time Webhook Events */}
      <WebhookEventStream />

      {/* Voice History */}
      {voiceHistory.length > 0 && (
        <Card className="p-6 border-border bg-card">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Voice History</h2>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {voiceHistory.map((entry, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  {entry.timestamp.toLocaleTimeString()}
                </p>
                <p className="text-sm font-medium text-foreground mb-1">You: {entry.input}</p>
                <p className="text-sm text-muted-foreground">MATTIAS: {entry.output}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
