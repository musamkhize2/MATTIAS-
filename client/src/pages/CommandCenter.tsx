import { trpc } from "@/lib/trpc";
import { Brain, Send, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  agentsInvolved?: string[];
  timestamp: Date;
}

const SUGGESTED_COMMANDS = [
  "What's the current state of my sales pipeline?",
  "Analyze my cash flow risk for the next 30 days",
  "What actions are pending my approval?",
  "Summarize recent marketing performance",
  "What compliance deadlines are approaching?",
  "Create a follow-up task for high-priority leads",
];

export default function CommandCenter() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `**Welcome to MATTIAS Command Center.**\n\nI am your AI Operating System — coordinating 8 specialized agents across your business and personal life. I can reason over events, surface insights, coordinate agents, and help you make decisions.\n\nWhat would you like to work on today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendMutation = trpc.command.send.useMutation({
    onSuccess: (data) => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          agentsInvolved: data.agentsInvolved,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (err) => {
      setIsTyping(false);
      toast.error("Command failed", { description: err.message });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;

    const userMsg: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const history = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    sendMutation.mutate({ message: trimmed, history });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor: "oklch(0.22 0.02 260)", background: "oklch(0.12 0.015 260)" }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "oklch(0.65 0.22 270 / 0.2)", border: "1px solid oklch(0.65 0.22 270 / 0.4)" }}
        >
          <Brain size={18} style={{ color: "oklch(0.75 0.22 270)" }} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide">MATTIAS</h1>
          <p className="text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>
            AI Command Interface · 8 agents ready
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: "oklch(0.68 0.2 145)" }} />
          <span className="text-xs" style={{ color: "oklch(0.55 0.02 260)" }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
              style={{
                background:
                  msg.role === "assistant"
                    ? "oklch(0.65 0.22 270 / 0.2)"
                    : "oklch(0.18 0.02 260)",
                border: `1px solid ${msg.role === "assistant" ? "oklch(0.65 0.22 270 / 0.4)" : "oklch(0.28 0.02 260)"}`,
              }}
            >
              {msg.role === "assistant" ? (
                <Brain size={14} style={{ color: "oklch(0.75 0.22 270)" }} />
              ) : (
                <span className="text-xs font-bold text-white">M</span>
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className="px-4 py-3 rounded-2xl text-sm"
                style={{
                  background:
                    msg.role === "assistant"
                      ? "oklch(0.13 0.015 260)"
                      : "oklch(0.65 0.22 270 / 0.25)",
                  border: `1px solid ${msg.role === "assistant" ? "oklch(0.22 0.02 260)" : "oklch(0.65 0.22 270 / 0.4)"}`,
                  color: "oklch(0.92 0.01 260)",
                }}
              >
                {msg.role === "assistant" ? (
                  <Streamdown>{msg.content}</Streamdown>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>

              {/* Agents involved */}
              {msg.agentsInvolved && msg.agentsInvolved.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.agentsInvolved.map((agent) => (
                    <span
                      key={agent}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "oklch(0.65 0.22 270 / 0.1)",
                        border: "1px solid oklch(0.65 0.22 270 / 0.25)",
                        color: "oklch(0.65 0.22 270)",
                      }}
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              )}

              <span className="text-xs" style={{ color: "oklch(0.4 0.02 260)" }}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.65 0.22 270 / 0.2)", border: "1px solid oklch(0.65 0.22 270 / 0.4)" }}
            >
              <Brain size={14} style={{ color: "oklch(0.75 0.22 270)" }} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl flex items-center gap-1"
              style={{ background: "oklch(0.13 0.015 260)", border: "1px solid oklch(0.22 0.02 260)" }}
            >
              <div className="w-2 h-2 rounded-full typing-dot" style={{ background: "oklch(0.65 0.22 270)" }} />
              <div className="w-2 h-2 rounded-full typing-dot" style={{ background: "oklch(0.65 0.22 270)" }} />
              <div className="w-2 h-2 rounded-full typing-dot" style={{ background: "oklch(0.65 0.22 270)" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested commands */}
      {messages.length === 1 && (
        <div className="px-6 py-3 border-t" style={{ borderColor: "oklch(0.22 0.02 260)" }}>
          <p className="text-xs mb-2" style={{ color: "oklch(0.45 0.02 260)" }}>
            Suggested commands
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInput(cmd)}
                className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-90"
                style={{
                  background: "oklch(0.15 0.015 260)",
                  border: "1px solid oklch(0.25 0.02 260)",
                  color: "oklch(0.65 0.02 260)",
                }}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: "oklch(0.22 0.02 260)", background: "oklch(0.12 0.015 260)" }}
      >
        <div
          className="flex items-end gap-3 rounded-xl px-4 py-3"
          style={{ background: "oklch(0.15 0.015 260)", border: "1px solid oklch(0.25 0.02 260)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Command MATTIAS… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground text-white"
            style={{ maxHeight: "120px", lineHeight: "1.5" }}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="shrink-0 h-8 w-8 p-0 rounded-lg"
            style={{
              background: input.trim() ? "oklch(0.65 0.22 270)" : "oklch(0.2 0.02 260)",
              color: "white",
            }}
          >
            <Send size={14} />
          </Button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "oklch(0.35 0.02 260)" }}>
          MATTIAS coordinates OperationsAgent, FinanceAgent, SalesAgent, MarketingAgent, KnowledgeAgent, PersonalLifeAgent, CommunicationAgent, ComplianceRiskAgent, and CriticAgent
        </p>
      </div>
    </div>
  );
}
