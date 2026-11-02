"use client";

import { useEffect, useState } from "react";
import { usePalmier } from "@/lib/palmier/store";
import {
  CheckCircle, XCircle, Server, Github, Sparkles, CursorArrow,
} from "@/components/palmier/icons";

export function StatusBar() {
  const mcpConnected = usePalmier((s) => s.mcpConnected);
  const setMcpConnected = usePalmier((s) => s.setMcpConnected);
  const mcpPort = usePalmier((s) => s.mcpPort);
  const project = usePalmier((s) => s.project);
  const toolMode = usePalmier((s) => s.toolMode);
  const selectedClipIds = usePalmier((s) => s.selectedClipIds);
  const [version] = useState("1.0.0");

  useEffect(() => {
    const probe = async () => {
      try {
        const r = await fetch("/api/mcp/status");
        const j = (await r.json()) as { connected?: boolean };
        setMcpConnected(!!j.connected);
      } catch {
        setMcpConnected(false);
      }
    };
    void probe();
    const t = setInterval(probe, 10_000);
    return () => clearInterval(t);
  }, [setMcpConnected]);

  return (
    <footer className="flex h-6 items-center justify-between border-t border-[var(--border-primary)] bg-[var(--bg-raised)] px-3 text-[10px] text-[var(--text-tertiary)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Sparkles size={10} className="text-[var(--accent-warm)]" />
          <span className="font-medium text-white/80">Palmier Pro</span>
          <span className="opacity-50">v{version}</span>
        </div>
        <span className="opacity-30">·</span>
        <div className="tabular">
          {project.settings.width}×{project.settings.height} @ {project.settings.fps}fps
        </div>
        <span className="opacity-30">·</span>
        <div className="flex items-center gap-1">
          <CursorArrow size={10} />
          <span className="capitalize">{toolMode}</span>
        </div>
        {selectedClipIds.length > 0 ? (
          <>
            <span className="opacity-30">·</span>
            <div className="tabular">{selectedClipIds.length} clip(s) selected</div>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <a href="https://github.com/palmier-io/palmier-pro" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 hover:text-white transition">
          <Github size={10} />
          <span className="hidden sm:inline">Source</span>
        </a>
        <div className="flex items-center gap-1">
          <Server size={10} />
          <span className="tabular">MCP :{mcpPort}</span>
          {mcpConnected ? (
            <CheckCircle size={10} className="text-[var(--status-success)]" />
          ) : (
            <XCircle size={10} className="text-[var(--status-error)]" />
          )}
        </div>
      </div>
    </footer>
  );
}
