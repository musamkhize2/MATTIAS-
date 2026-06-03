import LogoHeader from "@/components/LogoHeader";
import { trpc } from "@/lib/trpc";
import { Brain, Clock, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MemoryExplorer() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: entries, isLoading } = trpc.memory.list.useQuery({ limit: 50 });
  const { data: searchResults, isLoading: searching } = trpc.memory.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  const displayEntries = searchQuery.length > 2 ? (searchResults ?? []) : (entries ?? []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Memory Explorer</h1>
        <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 260)" }}>
          Persistent semantic memory — all past events and decisions recalled by agents
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.5 0.02 260)" }} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memory semantically..."
            className="pl-9 text-sm"
            style={{
              background: "oklch(0.15 0.015 260)",
              border: "1px solid oklch(0.25 0.02 260)",
              color: "oklch(0.9 0.01 260)",
            }}
            onKeyDown={(e) => e.key === "Enter" && setSearchQuery(query)}
          />
        </div>
        <Button
          onClick={() => setSearchQuery(query)}
          disabled={query.length < 3}
          className="text-sm"
          style={{ background: "oklch(0.65 0.22 270)", color: "white" }}
        >
          Search
        </Button>
        {searchQuery && (
          <Button
            variant="outline"
            onClick={() => { setQuery(""); setSearchQuery(""); }}
            className="text-sm"
            style={{ borderColor: "oklch(0.25 0.02 260)", color: "oklch(0.6 0.02 260)" }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "oklch(0.45 0.02 260)" }}>
        <div className="flex items-center gap-1">
          <Brain size={12} style={{ color: "oklch(0.62 0.22 300)" }} />
          <span>{entries?.length ?? 0} total memories</span>
        </div>
        {searchQuery && (
          <div className="flex items-center gap-1">
            <Search size={12} />
            <span>{searchResults?.length ?? 0} results for "{searchQuery}"</span>
          </div>
        )}
      </div>

      {/* Memory list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid oklch(0.22 0.02 260)" }}
      >
        {isLoading || searching ? (
          <div className="flex items-center justify-center py-16" style={{ background: "oklch(0.13 0.015 260)" }}>
            <Brain size={20} className="animate-pulse mr-2" style={{ color: "oklch(0.45 0.02 260)" }} />
            <span className="text-sm" style={{ color: "oklch(0.45 0.02 260)" }}>
              {searching ? "Searching memory..." : "Loading..."}
            </span>
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ background: "oklch(0.13 0.015 260)" }}>
            <Brain size={32} style={{ color: "oklch(0.3 0.02 260)" }} />
            <p className="text-sm" style={{ color: "oklch(0.45 0.02 260)" }}>
              {searchQuery ? "No memories match your query" : "No memories yet — trigger some events first"}
            </p>
          </div>
        ) : (
          <div style={{ background: "oklch(0.13 0.015 260)" }}>
            {displayEntries.map((entry, i) => {
              const meta = entry.metadata as Record<string, unknown> | null;
              const score = (entry as { score?: number }).score;
              return (
                <div
                  key={entry.id}
                  className="p-4 transition-colors hover:bg-white/5"
                  style={{
                    borderBottom: i < displayEntries.length - 1 ? "1px solid oklch(0.18 0.015 260)" : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-relaxed">{entry.content}</p>

                      {meta && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {meta.eventType != null && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-mono"
                              style={{
                                background: "oklch(0.65 0.22 270 / 0.1)",
                                border: "1px solid oklch(0.65 0.22 270 / 0.25)",
                                color: "oklch(0.65 0.22 270)",
                              }}
                            >
                              {String(meta.eventType)}
                            </span>
                          )}
                          {Array.isArray(meta.agents) && (meta.agents as string[]).map((agent) => (
                            <span
                              key={agent}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: "oklch(0.62 0.22 300 / 0.1)",
                                border: "1px solid oklch(0.62 0.22 300 / 0.25)",
                                color: "oklch(0.72 0.22 300)",
                              }}
                            >
                              {agent}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {score !== undefined && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-mono"
                          style={{
                            background: "oklch(0.68 0.2 145 / 0.1)",
                            border: "1px solid oklch(0.68 0.2 145 / 0.25)",
                            color: "oklch(0.68 0.2 145)",
                          }}
                        >
                          {(score * 100).toFixed(0)}% match
                        </span>
                      )}
                      <div className="flex items-center gap-1" style={{ color: "oklch(0.4 0.02 260)" }}>
                        <Clock size={11} />
                        <span className="text-xs">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
