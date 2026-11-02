"use client";

import { usePalmier, formatTimecode } from "@/lib/palmier/store";
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Trash2,
  Save, FolderOpen, Sparkles, ZoomIn, ZoomOut, Bot,
  CursorArrow, Razor, RippleTrim, RippleInsert, RangeSelect,
  MarkIn, MarkOut, TextGlyph, Activity, Wand2, Download,
  Undo, Redo,
} from "@/components/palmier/icons";
import { cn } from "@/lib/utils";

export function Toolbar() {
  const project = usePalmier((s) => s.project);
  const isPlaying = usePalmier((s) => s.isPlaying);
  const setPlaying = usePalmier((s) => s.setPlaying);
  const setPlayhead = usePalmier((s) => s.setPlayhead);
  const selectedClipIds = usePalmier((s) => s.selectedClipIds);
  const splitClip = usePalmier((s) => s.splitClip);
  const removeClip = usePalmier((s) => s.removeClip);
  const zoom = usePalmier((s) => s.zoom);
  const setZoom = usePalmier((s) => s.setZoom);
  const showToast = usePalmier((s) => s.showToast);
  const toolMode = usePalmier((s) => s.toolMode);
  const setToolMode = usePalmier((s) => s.setToolMode);
  const setInPoint = usePalmier((s) => s.setInPoint);
  const setOutPoint = usePalmier((s) => s.setOutPoint);
  const toggleScopes = usePalmier((s) => s.toggleScopes);
  const showScopes = usePalmier((s) => s.showScopes);
  const toggleAgent = usePalmier((s) => s.toggleAgent);
  const showAgent = usePalmier((s) => s.showAgent);
  const showEffects = usePalmier((s) => s.showEffects);
  const toggleEffects = usePalmier((s) => s.toggleEffects);

  const totalDuration = project.clips.length
    ? Math.max(...project.clips.map((c) => c.start + c.duration))
    : 0;

  const onPlayPause = () => setPlaying(!isPlaying);
  const onSkipStart = () => setPlayhead(0);
  const onSkipEnd = () => setPlayhead(totalDuration);

  const onSplit = () => {
    if (selectedClipIds.length === 0) {
      showToast("No clip selected", "Select a clip first to split at the playhead.");
      return;
    }
    selectedClipIds.forEach((id) => splitClip(id, project.playhead));
    showToast("Clip split", `At ${formatTimecode(project.playhead, project.settings.fps)}`);
  };

  const onDelete = () => {
    if (selectedClipIds.length === 0) return;
    selectedClipIds.forEach((id) => removeClip(id));
    showToast(`${selectedClipIds.length} clip(s) removed`);
  };

  const onMarkIn = () => setInPoint(project.playhead);
  const onMarkOut = () => setOutPoint(project.playhead);

  const onSave = async () => {
    const r = await fetch("/api/project/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(project),
    });
    if (!r.ok) {
      showToast("Save failed");
      return;
    }
    const blob = await r.blob();
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${project.settings.name.replace(/[^\w-]+/g, "_")}.palmier.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Project saved", a.download);
  };

  const onLoad = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.palmier.json,application/json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const p = JSON.parse(text);
        usePalmier.getState().loadProject(p);
        showToast("Project loaded", f.name);
      } catch {
        showToast("Load failed", "Invalid project file.");
      }
    };
    input.click();
  };

  const onExport = async () => {
    const r = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project, format: "mp4", resolution: "1080p" }),
    });
    const plan = await r.json();
    if (!plan.ok) {
      showToast("Export failed", plan.error ?? "Unknown error");
      return;
    }
    showToast(
      "Export plan ready",
      `${plan.segments.length} segment(s), ${plan.totalDuration.toFixed(1)}s total.`,
    );
  };

  return (
    <header className="flex h-[38px] items-center gap-[10px] bg-[var(--bg-base)] px-3 text-white">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="brand-mark">
          <Sparkles size={14} />
        </div>
        <div className="text-[13px] font-semibold tracking-tight">Palmier Pro</div>
      </div>

      <Divider />

      {/* Tools (left cluster) */}
      <div className="flex items-center gap-0.5">
        <ToolButton title="Undo (Ctrl+Z)" onClick={() => showToast("Undo", "Not implemented yet")}>
          <Undo size={13} />
        </ToolButton>
        <ToolButton title="Redo (Ctrl+Shift+Z)" onClick={() => showToast("Redo", "Not implemented yet")}>
          <Redo size={13} />
        </ToolButton>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <ToolButton title="Select tool (V)" shortcut="V"
          active={toolMode === "select"} onClick={() => setToolMode("select")}>
          <CursorArrow size={13} />
        </ToolButton>
        <ToolButton title="Razor tool (B)" shortcut="B"
          active={toolMode === "razor"} onClick={() => setToolMode("razor")}>
          <Razor size={13} />
        </ToolButton>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <ToolButton title="Split at playhead (S)" shortcut="S" onClick={onSplit}>
          <Scissors size={13} />
        </ToolButton>
        <ToolButton title="Mark In (I)" shortcut="I" onClick={onMarkIn}>
          <MarkIn size={14} />
        </ToolButton>
        <ToolButton title="Mark Out (O)" shortcut="O" onClick={onMarkOut}>
          <MarkOut size={14} />
        </ToolButton>
        <ToolButton title="Delete clip (Del)" onClick={onDelete}>
          <Trash2 size={13} />
        </ToolButton>
        <ToolButton title="Add text clip" onClick={() => {
          // Add text clip on first text track at playhead
          const textTrack = project.tracks.find((t) => t.kind === "text");
          if (!textTrack) return;
          usePalmier.getState().addClip({
            id: Math.random().toString(36).slice(2),
            trackId: textTrack.id,
            type: "text",
            start: project.playhead,
            duration: 3,
            sourceStart: 0, sourceEnd: 3,
            speed: 1, volume: 1,
            text: "Your text here",
            textStyle: { fontFamily: "Geist, sans-serif", fontSize: 48, fontWeight: 700, color: "#ffffff", align: "center", positionY: 0.9, case: "none" },
            transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
            crop: { top: 0, bottom: 0, left: 0, right: 0 },
            colorGrade: { liftHue: 0, liftSat: 0, liftLuma: 0, gammaHue: 0, gammaSat: 0, gammaLuma: 0, gainHue: 0, gainSat: 0, gainLuma: 0, exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0, blacks: 0, whites: 0, vibrance: 0, clarity: 0, dehaze: 0 },
            fadeIn: 0, fadeOut: 0,
            color: "#B72DD2",
            effects: [], keyframes: [],
          });
        }}>
          <TextGlyph size={16} />
        </ToolButton>
      </div>

      <Divider />

      {/* Transport cluster */}
      <div className="flex items-center gap-0.5">
        <ToolButton title="Jump to start (Home)" onClick={onSkipStart}>
          <SkipBack size={13} />
        </ToolButton>
        <button
          onClick={onPlayPause}
          className="mx-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition hover:bg-[#F5EFE4]"
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <ToolButton title="Jump to end (End)" onClick={onSkipEnd}>
          <SkipForward size={13} />
        </ToolButton>
      </div>

      {/* Timecode */}
      <div className="ml-2 flex items-baseline gap-2">
        <div className="timecode-readout rounded bg-black/50 px-2 py-1 text-[11px]">
          {formatTimecode(project.playhead, project.settings.fps)}
        </div>
        <div className="text-[11px] font-mono text-[var(--text-tertiary)] tabular">
          / {formatTimecode(totalDuration, project.settings.fps)}
        </div>
      </div>

      <Divider />

      {/* Project name (inline editable) */}
      <input
        aria-label="Project name"
        className="bg-transparent text-[12px] font-medium outline-none rounded px-2 py-1 w-44 hover:bg-white/5 focus:bg-white/8 transition"
        value={project.settings.name}
        onChange={(e) => usePalmier.getState().setProjectSettings({ name: e.target.value })}
      />

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        {/* Zoom */}
        <div className="flex items-center gap-0.5 mr-2">
          <ToolButton title="Zoom out (-)" onClick={() => setZoom(zoom * 0.8)}>
            <ZoomOut size={13} />
          </ToolButton>
          <div className="w-12 text-center font-mono text-[10px] text-[var(--text-tertiary)] tabular">
            {Math.round(zoom)}px/s
          </div>
          <ToolButton title="Zoom in (+)" onClick={() => setZoom(zoom * 1.25)}>
            <ZoomIn size={13} />
          </ToolButton>
        </div>

        <Divider />

        {/* Toggles */}
        <ToolButton title="Toggle video scopes (Shift+S)"
          active={showScopes} onClick={toggleScopes}>
          <Activity size={13} />
        </ToolButton>
        <ToolButton title="Toggle effects panel"
          active={showEffects} onClick={toggleEffects}>
          <Wand2 size={13} />
        </ToolButton>
        <ToolButton title="Toggle agent panel (Shift+A)"
          active={showAgent} onClick={toggleAgent}>
          <Bot size={13} />
        </ToolButton>

        <Divider />

        {/* File ops */}
        <ToolButton title="Open project (.json)" onClick={onLoad}>
          <FolderOpen size={13} />
        </ToolButton>
        <ToolButton title="Save project (.json) — Ctrl+S" onClick={onSave}>
          <Save size={13} />
        </ToolButton>
        <button
          onClick={onExport}
          className="capsule primary ml-1"
          title="Export video (Ctrl+E)"
        >
          <Download size={11} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-[var(--border-primary)]" />;
}

function ToolButton({
  children, onClick, title, active, shortcut,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("tool-btn", active && "is-active")}
      aria-label={title}
      title={title + (shortcut ? ` · ${shortcut}` : "")}
    >
      {children}
    </button>
  );
}
