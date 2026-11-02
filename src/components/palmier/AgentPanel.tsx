"use client";

import { useEffect, useRef, useState } from "react";
import { usePalmier } from "@/lib/palmier/store";
import { newId } from "@/lib/palmier/types";
import {
  Bot, Send, Trash2, Plug, CheckCircle, XCircle, Copy, Sparkles, X,
  Terminal, FileText, FilmIcon, Wand2, MessageSquare,
} from "@/components/palmier/icons";
import { cn } from "@/lib/utils";

interface AgentPanelProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  { icon: FilmIcon, text: "Plan a 30-second promo for a coffee brand" },
  { icon: FileText, text: "Write captions in Arabic for the whole timeline" },
  { icon: Wand2, text: "Apply a warm cinematic LUT to the first clip" },
  { icon: Terminal, text: "Remove all silence from my audio track" },
];

export function AgentPanel({ open, onClose }: AgentPanelProps) {
  const chat = usePalmier((s) => s.chat);
  const pushChat = usePalmier((s) => s.pushChat);
  const updateChat = usePalmier((s) => s.updateChat);
  const clearChat = usePalmier((s) => s.clearChat);
  const mcpUrl = usePalmier((s) => s.mcpUrl);
  const mcpConnected = usePalmier((s) => s.mcpConnected);
  const setMcpConnected = usePalmier((s) => s.setMcpConnected);
  const project = usePalmier((s) => s.project);
  const showToast = usePalmier((s) => s.showToast);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const probe = async () => {
      try {
        const r = await fetch("/api/mcp/status");
        const j = (await r.json()) as { connected?: boolean };
        if (alive) setMcpConnected(!!j.connected);
      } catch {
        if (alive) setMcpConnected(false);
      }
    };
    void probe();
    const t = setInterval(probe, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [open, setMcpConnected]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.length, thinking]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");

    pushChat({ id: newId("msg"), role: "user", content: text, ts: Date.now() });

    const totalDur = project.clips.length
      ? Math.max(...project.clips.map((c) => c.start + c.duration))
      : 0;
    const context = `Project: ${project.settings.name}
Resolution: ${project.settings.width}x${project.settings.height} @ ${project.settings.fps}fps
Tracks: ${project.tracks.length} (V: ${project.tracks.filter(t=>t.kind==="video").length}, A: ${project.tracks.filter(t=>t.kind==="audio").length}, T: ${project.tracks.filter(t=>t.kind==="text").length})
Clips: ${project.clips.length}
Duration: ${totalDur.toFixed(1)}s`;

    const pendingId = newId("msg");
    pushChat({ id: pendingId, role: "assistant", content: "", ts: Date.now(), pending: true });
    setThinking(true);

    try {
      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...chat
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: `${text}\n\n[Project context]\n${context}` },
          ],
        }),
      });
      const j = (await r.json()) as { content?: string; error?: string; message?: string };
      if (!r.ok) {
        updateChat(pendingId, {
          content: `Failed: ${j.message ?? j.error ?? "unknown error"}`,
          pending: false,
        });
      } else {
        updateChat(pendingId, {
          content: j.content ?? "(empty response)",
          pending: false,
        });
      }
    } catch (e) {
      updateChat(pendingId, {
        content: `Network error: ${(e as Error).message}`,
        pending: false,
      });
    } finally {
      setThinking(false);
    }
  };

  const onCopyMcpUrl = () => {
    void navigator.clipboard.writeText(mcpUrl);
    showToast("MCP URL copied", mcpUrl);
  };

  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-[var(--border-primary)] bg-[var(--bg-surface)] shadow-2xl">
      {/* Header */}
      <div className="panel-header justify-between">
        <div className="flex items-center gap-2">
          <div className="brand-mark h-6 w-6">
            <Bot size={12} />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-white">Palmier Agent</div>
            <div className="flex items-center gap-1 text-[9px] text-[var(--text-tertiary)]">
              {mcpConnected ? (
                <>
                  <CheckCircle size={9} className="text-[var(--status-success)]" />
                  MCP online
                </>
              ) : (
                <>
                  <XCircle size={9} className="text-[var(--status-error)]" />
                  MCP offline
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="tool-btn h-6 w-6" onClick={clearChat} title="Clear chat">
            <Trash2 size={11} />
          </button>
          <button className="tool-btn h-6 w-6" onClick={onClose} title="Close">
            <X size={11} />
          </button>
        </div>
      </div>

      {/* MCP info bar */}
      <div className="border-b border-[var(--border-primary)] bg-white/[0.02] p-2">
        <div className="flex items-center gap-2">
          <Plug size={11} className="text-[var(--text-muted)]" />
          <code className="flex-1 truncate font-mono text-[10px] text-[var(--text-tertiary)]">{mcpUrl}</code>
          <button className="capsule" onClick={onCopyMcpUrl}>
            <Copy size={9} /> Copy
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-[var(--text-muted)]">
          Connect Claude Code / Cursor / Codex to this URL to drive the timeline.
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {chat.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-white to-[#C8C8C8]">
              <Sparkles size={20} className="text-black" />
            </div>
            <div className="mb-1 text-[13px] font-medium text-white">How can I help your edit?</div>
            <div className="mb-4 max-w-[260px] text-[11px] text-[var(--text-tertiary)] leading-relaxed">
              Ask me to plan an edit, write a script, or call out the exact MCP tool for what you want to do.
            </div>
            <div className="flex w-full flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => setInput(s.text)}
                  className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-white/[0.02] px-3 py-2 text-left text-[11px] text-[var(--text-tertiary)] transition hover:border-[var(--accent-warm)]/40 hover:text-white"
                >
                  <s.icon size={12} className="text-[var(--accent-warm)]" />
                  <span className="flex-1">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {chat.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}
              >
                <div className={cn(
                  "max-w-[85%] rounded-md px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-white text-black"
                    : "bg-white/[0.04] text-white border border-[var(--border-subtle)]",
                )}>
                  {m.pending && !m.content ? (
                    <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                    </span>
                  ) : m.content}
                </div>
                <div className="px-1 text-[9px] text-[var(--text-muted)] tabular">
                  {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--border-primary)] p-3">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            placeholder="Ask the agent, or @palmier to address the editor..."
            className="w-full resize-none rounded-[20px] border border-[var(--border-subtle)] bg-white/[0.04] px-3 py-2 pr-10 text-[12px] text-white outline-none transition focus:border-[var(--accent-warm)]/35 focus:bg-white/[0.06] placeholder:text-[var(--text-muted)]"
            style={{ minHeight: 36, maxHeight: 96 }}
            rows={1}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || thinking}
            className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-warm)] text-black transition hover:bg-white disabled:opacity-30"
            title="Send (Enter)"
          >
            <Send size={10} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1">
            <span className="rounded px-1.5 py-0.5 border border-[var(--border-subtle)]">Enter to send</span>
            <span className="rounded px-1.5 py-0.5 border border-[var(--border-subtle)]">Shift+Enter newline</span>
          </div>
          <span className="flex items-center gap-1">
            <MessageSquare size={9} /> {chat.length} msgs
          </span>
        </div>
      </div>
    </div>
  );
}
