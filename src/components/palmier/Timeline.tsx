"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePalmier, formatTimecode } from "@/lib/palmier/store";
import {
  Clip, Track, newId, defaultTextStyle, clipTypeColor,
} from "@/lib/palmier/types";
import {
  Eye, EyeOff, Lock, Unlock, Volume2, VolumeX, Plus, Trash2,
  GripVertical, Link2, FilmIcon, MusicIcon, TextGlyph, ImageIcon,
} from "@/components/palmier/icons";
import { cn } from "@/lib/utils";

const RULER_HEIGHT = 24;
const TRACK_HEADER_WIDTH = 100;

export function Timeline() {
  const project = usePalmier((s) => s.project);
  const zoom = usePalmier((s) => s.zoom);
  const selectedClipIds = usePalmier((s) => s.selectedClipIds);
  const selectClip = usePalmier((s) => s.selectClip);
  const setPlayhead = usePalmier((s) => s.setPlayhead);
  const setPlaying = usePalmier((s) => s.setPlaying);
  const moveClip = usePalmier((s) => s.moveClip);
  const trimClip = usePalmier((s) => s.trimClip);
  const splitClip = usePalmier((s) => s.splitClip);
  const removeClip = usePalmier((s) => s.removeClip);
  const addTrack = usePalmier((s) => s.addTrack);
  const removeTrack = usePalmier((s) => s.removeTrack);
  const toggleMute = usePalmier((s) => s.toggleTrackMute);
  const toggleHidden = usePalmier((s) => s.toggleTrackHidden);
  const toggleLock = usePalmier((s) => s.toggleTrackLock);
  const toggleSyncLock = usePalmier((s) => s.toggleSyncLock);
  const addClipFromMedia = usePalmier((s) => s.addClipFromMedia);
  const insertClipFromMedia = usePalmier((s) => s.insertClipFromMedia);
  const addClip = usePalmier((s) => s.addClip);
  const setZoom = usePalmier((s) => s.setZoom);
  const toolMode = usePalmier((s) => s.toolMode);
  const setToolMode = usePalmier((s) => s.setToolMode);
  const setInPoint = usePalmier((s) => s.setInPoint);
  const setOutPoint = usePalmier((s) => s.setOutPoint);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | null
    | {
        kind: "move" | "trim-start" | "trim-end";
        clipId: string;
        startX: number;
        origStart: number;
        origDuration: number;
        origSourceStart: number;
        origTrackId: string;
      }
  >(null);

  const totalDuration = project.clips.length
    ? Math.max(...project.clips.map((c) => c.start + c.duration))
    : 0;

  const viewDuration = Math.max(30, totalDuration + 10);
  const contentWidth = viewDuration * zoom;

  const ticks = useMemo(() => {
    const targetPxPerTick = 80;
    const secondsPerTick = niceTickStep(targetPxPerTick / zoom);
    const count = Math.ceil(viewDuration / secondsPerTick) + 1;
    return { secondsPerTick, items: Array.from({ length: count }, (_, i) => i * secondsPerTick) };
  }, [viewDuration, zoom]);

  const findTrackAtY = useCallback((clientY: number): string | null => {
    if (!scrollRef.current) return null;
    const rect = scrollRef.current.getBoundingClientRect();
    const y = clientY - rect.top + scrollRef.current.scrollTop - RULER_HEIGHT;
    let acc = 0;
    for (const t of project.tracks) {
      if (y >= acc && y < acc + t.height) return t.id;
      acc += t.height;
    }
    return null;
  }, [project.tracks]);

  const onRulerClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
    setPlaying(false);
    setPlayhead(x / zoom);
  };

  const onClipMouseDown = (
    e: React.MouseEvent,
    clip: Clip,
    kind: "move" | "trim-start" | "trim-end",
  ) => {
    e.stopPropagation();
    if (toolMode === "razor") {
      const rect = (e.currentTarget.closest(".timeline-lane") as HTMLElement)?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
        splitClip(clip.id, x / zoom);
      }
      return;
    }
    selectClip(clip.id, e.shiftKey);
    dragRef.current = {
      kind, clipId: clip.id, startX: e.clientX,
      origStart: clip.start, origDuration: clip.duration,
      origSourceStart: clip.sourceStart, origTrackId: clip.trackId,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dt = dx / zoom;
      if (d.kind === "move") {
        const targetTrackId = findTrackAtY(e.clientY);
        moveClip(d.clipId, Math.max(0, d.origStart + dt), targetTrackId ?? d.origTrackId);
      } else if (d.kind === "trim-start") {
        trimClip(d.clipId, "start", dt);
        d.startX = e.clientX;
        d.origStart += dt;
        d.origDuration -= dt;
        d.origSourceStart += dt;
      } else if (d.kind === "trim-end") {
        trimClip(d.clipId, "end", dt);
        d.startX = e.clientX;
        d.origDuration += dt;
      }
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [zoom, moveClip, trimClip, findTrackAtY]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        usePalmier.getState().setPlaying(!usePalmier.getState().isPlaying);
        return;
      }
      if (e.key === "s" || e.key === "S") {
        if (selectedClipIds.length) {
          selectedClipIds.forEach((id) => splitClip(id, usePalmier.getState().project.playhead));
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        selectedClipIds.forEach((id) => removeClip(id));
      } else if (e.key === "v" || e.key === "V") setToolMode("select");
      else if (e.key === "b" || e.key === "B") setToolMode("razor");
      else if (e.key === "i" || e.key === "I") setInPoint(usePalmier.getState().project.playhead);
      else if (e.key === "o" || e.key === "O") setOutPoint(usePalmier.getState().project.playhead);
      else if (e.key === "+" || e.key === "=") setZoom(usePalmier.getState().zoom * 1.25);
      else if (e.key === "-") setZoom(usePalmier.getState().zoom * 0.8);
      else if (e.key === "Home") setPlayhead(0);
      else if (e.key === "End") setPlayhead(totalDuration);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClipIds, splitClip, removeClip, setToolMode, setInPoint, setOutPoint, setZoom, setPlayhead, totalDuration]);

  const onDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const mediaId = e.dataTransfer.getData("text/palmier-media");
    if (!mediaId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
    const start = Math.max(0, x / zoom);
    if (toolMode === "rippleInsert" || e.altKey) {
      const clip = insertClipFromMedia(mediaId, trackId, start);
      if (clip) selectClip(clip.id);
    } else {
      const clip = addClipFromMedia(mediaId, trackId, start);
      if (clip) selectClip(clip.id);
    }
  };

  const onAddTextClip = (trackId: string) => {
    const track = project.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const end = project.clips
      .filter((c) => c.trackId === trackId)
      .reduce((max, c) => Math.max(max, c.start + c.duration), 0);
    const clip: Clip = {
      id: newId("clip"),
      trackId,
      type: "text",
      start: end,
      duration: 3,
      sourceStart: 0,
      sourceEnd: 3,
      speed: 1,
      volume: 1,
      text: "Your text here",
      textStyle: { ...defaultTextStyle },
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      crop: { top: 0, bottom: 0, left: 0, right: 0 },
      colorGrade: {
        liftHue: 0, liftSat: 0, liftLuma: 0,
        gammaHue: 0, gammaSat: 0, gammaLuma: 0,
        gainHue: 0, gainSat: 0, gainLuma: 0,
        exposure: 0, contrast: 0, saturation: 0,
        temperature: 0, tint: 0,
        highlights: 0, shadows: 0, blacks: 0, whites: 0,
        vibrance: 0, clarity: 0, dehaze: 0,
      },
      fadeIn: 0,
      fadeOut: 0,
      color: clipTypeColor("text"),
      effects: [],
      keyframes: [],
    };
    addClip(clip);
    selectClip(clip.id);
  };

  // Find video/audio zone boundary for the 2px divider
  const videoTracks = project.tracks.filter((t) => t.kind === "video" || t.kind === "text");
  const audioTracks = project.tracks.filter((t) => t.kind === "audio");

  return (
    <div className="flex h-full flex-col bg-[var(--bg-surface)]">
      {/* Panel header */}
      <div className="panel-header justify-between">
        <div className="flex items-center gap-2">
          <FilmIcon size={11} />
          <span className="panel-header-title">Timeline</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="capsule" onClick={() => addTrack("video")} title="Add video track">
            <Plus size={10} /> V
          </button>
          <button className="capsule" onClick={() => addTrack("audio")} title="Add audio track">
            <Plus size={10} /> A
          </button>
          <button className="capsule" onClick={() => addTrack("text")} title="Add text track">
            <Plus size={10} /> T
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Track headers column */}
        <div className="shrink-0 border-r border-[var(--border-primary)] bg-[var(--bg-surface)]"
          style={{ width: TRACK_HEADER_WIDTH }}>
          {/* Ruler spacer */}
          <div className="border-b border-[var(--border-primary)] bg-[var(--bg-raised)]"
            style={{ height: RULER_HEIGHT }} />
          {project.tracks.map((t, i) => {
            const isZoneBoundary = i > 0 && project.tracks[i-1].kind !== t.kind;
            return (
              <TrackHeader
                key={t.id}
                track={t}
                isZoneBoundary={isZoneBoundary}
                onToggleMute={() => toggleMute(t.id)}
                onToggleHidden={() => toggleHidden(t.id)}
                onToggleLock={() => toggleLock(t.id)}
                onToggleSyncLock={() => toggleSyncLock(t.id)}
                onRemove={() => removeTrack(t.id)}
                onAddText={() => onAddTextClip(t.id)}
              />
            );
          })}
        </div>

        {/* Scrollable timeline area */}
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-auto"
          onClick={() => selectClip(null)}
        >
          <div className="relative" style={{ width: contentWidth, minHeight: "100%" }}>
            {/* Ruler */}
            <div
              className="sticky top-0 z-20 border-b border-[var(--border-primary)] bg-[var(--bg-surface)]"
              style={{ height: RULER_HEIGHT, width: contentWidth }}
              onMouseDown={onRulerClick}
            >
              {ticks.items.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full"
                  style={{ left: t * zoom }}
                >
                  {/* Major tick — 1px wide × 8px tall from bottom */}
                  <div className="absolute bottom-0 left-0 w-px h-2 bg-[var(--text-muted)]" />
                  {/* Minor tick at midpoint — 0.5px × 4px */}
                  <div className="absolute bottom-0 w-px h-1 bg-[var(--text-muted)] opacity-40"
                    style={{ left: ticks.secondsPerTick * zoom / 2 }} />
                  {/* Timecode label */}
                  <div className="absolute top-0 left-[3px] font-mono text-[10px] leading-none text-[var(--text-tertiary)] tabular pt-1">
                    {formatTimecode(t, project.settings.fps).replace(/^00:/, "").replace(/^0/, "")}
                  </div>
                </div>
              ))}
            </div>

            {/* Tracks */}
            {project.tracks.map((t, i) => {
              const isZoneBoundary = i > 0 && project.tracks[i-1].kind !== t.kind;
              return (
                <TrackLane
                  key={t.id}
                  track={t}
                  clips={project.clips.filter((c) => c.trackId === t.id)}
                  zoom={zoom}
                  width={contentWidth}
                  selectedClipIds={selectedClipIds}
                  toolMode={toolMode}
                  onMouseDownClip={onClipMouseDown}
                  onDrop={(e) => onDrop(e, t.id)}
                  onClickAddText={() => onAddTextClip(t.id)}
                  playhead={project.playhead}
                  isZoneBoundary={isZoneBoundary}
                />
              );
            })}

            {/* In/Out markers */}
            {project.inPoint != null ? (
              <div className="range-marker in" style={{ left: project.inPoint * zoom }} />
            ) : null}
            {project.outPoint != null ? (
              <div className="range-marker out" style={{ left: project.outPoint * zoom }} />
            ) : null}

            {/* Playhead — systemRed with downward triangle head */}
            <div className="timeline-playhead" style={{ left: project.playhead * zoom }}>
              <div className="timeline-playhead-head" />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-6 items-center justify-between border-t border-[var(--border-primary)] bg-[var(--bg-raised)] px-3 text-[10px] text-[var(--text-tertiary)]">
        <div className="flex items-center gap-3">
          <span className="tabular">{project.clips.length} clips</span>
          <span>·</span>
          <span className="tabular">{project.tracks.length} tracks</span>
          <span>·</span>
          <span className="tabular">{project.settings.width}×{project.settings.height} @ {project.settings.fps}fps</span>
          <span>·</span>
          <span className="capitalize">{toolMode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Zoom</span>
          <input
            type="range" min={20} max={300} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="palmier-range w-32"
          />
        </div>
      </div>
    </div>
  );
}

function niceTickStep(seconds: number): number {
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  for (const c of candidates) if (c >= seconds) return c;
  return 600;
}

function TrackHeader({
  track, isZoneBoundary, onToggleMute, onToggleHidden, onToggleLock, onToggleSyncLock, onRemove, onAddText,
}: {
  track: Track;
  isZoneBoundary: boolean;
  onToggleMute: () => void;
  onToggleHidden: () => void;
  onToggleLock: () => void;
  onToggleSyncLock: () => void;
  onRemove: () => void;
  onAddText: () => void;
}) {
  return (
    <div
      className={cn("timeline-lane relative flex items-center gap-1 px-2")}
      style={{
        height: track.height,
        borderTop: isZoneBoundary ? "2px solid var(--border-divider)" : undefined,
      }}
    >
      <div className={cn("track-header-strip", track.kind)} />
      <GripVertical size={11} className="text-[var(--text-muted)] opacity-40" />
      <div className="flex-1 truncate text-[11px] font-medium text-[var(--text-secondary)]">
        {track.name}
      </div>
      {track.kind === "text" ? (
        <button onClick={onAddText}
          className="tool-btn h-5 w-5"
          title="Add text clip">
          <TextGlyph size={11} />
        </button>
      ) : null}
      <button onClick={onToggleSyncLock}
        className={cn("tool-btn h-5 w-5",
          track.syncLock ? "text-[#F29933]" : "text-[var(--text-muted)] opacity-40")}
        title="Sync lock">
        <Link2 size={11} />
      </button>
      {track.kind === "audio" ? (
        <button onClick={onToggleMute}
          className={cn("tool-btn h-5 w-5",
            track.muted ? "text-[var(--status-error)]" : "text-[var(--text-muted)]")}
          title={track.muted ? "Unmute" : "Mute"}>
          {track.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
        </button>
      ) : (
        <button onClick={onToggleHidden}
          className={cn("tool-btn h-5 w-5",
            track.hidden ? "text-[var(--text-muted)] opacity-40" : "text-[var(--text-muted)]")}
          title={track.hidden ? "Show" : "Hide"}>
          {track.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
      )}
      <button onClick={onToggleLock}
        className={cn("tool-btn h-5 w-5",
          track.locked ? "text-[#F29933]" : "text-[var(--text-muted)]")}
        title={track.locked ? "Unlock" : "Lock"}>
        {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
      </button>
      <button onClick={onRemove}
        className="tool-btn h-5 w-5 hover:text-[var(--status-error)]"
        title="Remove track">
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function TrackLane({
  track, clips, zoom, width, selectedClipIds, toolMode, onMouseDownClip, onDrop, onClickAddText, playhead, isZoneBoundary,
}: {
  track: Track;
  clips: Clip[];
  zoom: number;
  width: number;
  selectedClipIds: string[];
  toolMode: string;
  onMouseDownClip: (e: React.MouseEvent, clip: Clip, kind: "move" | "trim-start" | "trim-end") => void;
  onDrop: (e: React.DragEvent) => void;
  onClickAddText: () => void;
  playhead: number;
  isZoneBoundary: boolean;
}) {
  return (
    <div
      className={cn("timeline-lane relative", isZoneBoundary && "audio-zone")}
      style={{
        height: track.height, width,
        borderTop: isZoneBoundary ? "2px solid var(--border-divider)" : undefined,
        background: "transparent",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Subtle alternating shade */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(255, 255, 255, 0.008)" }} />
      {clips.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-muted)] opacity-50">
          {track.kind === "text" ? (
            <button className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-white/5"
              onClick={onClickAddText}>
              <Plus size={10} /> Add text
            </button>
          ) : (
            "Drop media here"
          )}
        </div>
      ) : null}
      {clips.map((c) => (
        <ClipBlock
          key={c.id}
          clip={c}
          track={track}
          zoom={zoom}
          selected={selectedClipIds.includes(c.id)}
          toolMode={toolMode}
          onMouseDown={onMouseDownClip}
          playhead={playhead}
        />
      ))}
    </div>
  );
}

function ClipBlock({
  clip, track, zoom, selected, toolMode, onMouseDown, playhead,
}: {
  clip: Clip;
  track: Track;
  zoom: number;
  selected: boolean;
  toolMode: string;
  onMouseDown: (e: React.MouseEvent, clip: Clip, kind: "move" | "trim-start" | "trim-end") => void;
  playhead: number;
}) {
  const left = clip.start * zoom;
  const width = Math.max(8, clip.duration * zoom);
  const themeColor = clip.color ?? clipTypeColor(clip.type);
  const isAtPlayhead = playhead >= clip.start && playhead < clip.start + clip.duration;

  // Convert hex to rgba for fill
  const hexToRgba = (hex: string, alpha: number) => {
    const m = hex.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const fillColor = selected ? hexToRgba(themeColor, 0.45) : hexToRgba(themeColor, 0.30);

  const label =
    clip.type === "text" || clip.type === "caption"
      ? clip.text ?? "Text"
      : clip.type === "audio"
        ? (clip.mediaId ? "♪ " + clip.mediaId : "audio")
        : clip.mediaId ?? clip.type;

  return (
    <div
      className={cn("timeline-clip", selected && "is-selected")}
      style={{
        left, width,
        top: 2, bottom: 2,
        background: fillColor,
        cursor: toolMode === "razor" ? "crosshair" : "pointer",
      }}
      onMouseDown={(e) => onMouseDown(e, clip, "move")}
      title={label}
    >
      {/* Left saturation strip */}
      <div className="timeline-clip-strip" style={{ background: themeColor }} />

      {/* Thumbnail strip for video/image clips */}
      {(clip.type === "video" || clip.type === "image") && width > 30 ? (
        <div className="absolute inset-0 flex" style={{ paddingLeft: 3 }}>
          <ThumbnailStrip clip={clip} width={width - 3} height={track.height - 4} />
        </div>
      ) : null}

      {/* Waveform for audio clips */}
      {clip.type === "audio" && width > 30 ? (
        <Waveform clip={clip} width={width} height={track.height - 4} themeColor={themeColor} />
      ) : null}

      {/* Label bar (top 16px) */}
      <div className="timeline-clip-label">
        {clip.type === "audio" ? <MusicIcon size={10} /> :
         clip.type === "text" ? <TextGlyph size={10} /> :
         clip.type === "image" ? <ImageIcon size={10} /> :
         <FilmIcon size={10} />}
        <span className="truncate">{label}</span>
      </div>

      {/* Trim handles */}
      <div className="timeline-clip-trim left"
        onMouseDown={(e) => onMouseDown(e, clip, "trim-start")} />
      <div className="timeline-clip-trim right"
        onMouseDown={(e) => onMouseDown(e, clip, "trim-end")} />

      {/* Fade indicators */}
      {clip.fadeIn > 0 ? (
        <div className="absolute left-0 top-0 h-full pointer-events-none"
          style={{
            width: Math.min(clip.fadeIn * zoom, width / 2),
            background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)",
          }} />
      ) : null}
      {clip.fadeOut > 0 ? (
        <div className="absolute right-0 top-0 h-full pointer-events-none"
          style={{
            width: Math.min(clip.fadeOut * zoom, width / 2),
            background: "linear-gradient(to left, rgba(0,0,0,0.5), transparent)",
          }} />
      ) : null}

      {/* Linked indicator */}
      {clip.linkedClipIds && clip.linkedClipIds.length > 0 ? (
        <div className="absolute bottom-0.5 right-1 opacity-60">
          <Link2 size={9} />
        </div>
      ) : null}

      {/* Playhead-position highlight on this clip */}
      {isAtPlayhead ? (
        <div className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: (playhead - clip.start) * zoom,
            width: 1,
            background: "#FF3B30",
            boxShadow: "0 0 3px rgba(255, 59, 48, 0.8)",
          }} />
      ) : null}
    </div>
  );
}

function ThumbnailStrip({ clip, width, height }: { clip: Clip; width: number; height: number }) {
  const project = usePalmier((s) => s.project);
  const media = project.media.find((m) => m.id === clip.mediaId);
  if (!media?.thumbnail) return null;
  const thumbW = 48;
  const count = Math.max(1, Math.floor(width / thumbW));
  return (
    <div className="flex h-full w-full" style={{ opacity: 0.55 }}>
      {Array.from({ length: count }, (_, i) => (
        <img
          key={i}
          src={media.thumbnail}
          alt=""
          className="h-full"
          style={{ width: thumbW, objectFit: "cover", objectPosition: "center" }}
          draggable={false}
        />
      ))}
    </div>
  );
}

function Waveform({ clip, width, height, themeColor }: { clip: Clip; width: number; height: number; themeColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const samples = Math.max(40, Math.floor(width / 2));
    // Blend themeColor with white at 0.3 + 0.85 alpha
    const m = themeColor.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    const br = Math.round(r + (255 - r) * 0.3);
    const bg = Math.round(g + (255 - g) * 0.3);
    const bb = Math.round(b + (255 - b) * 0.3);
    ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.85)`;

    const midY = height / 2;
    const maxH = height * 0.42;
    let seed = 0;
    for (let i = 0; i < clip.id.length; i++) seed = (seed * 31 + clip.id.charCodeAt(i)) >>> 0;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * width;
      const w = Math.max(1, width / samples - 0.5);
      const attack = Math.min(1, i / 20);
      const decay = Math.min(1, (samples - i) / 20);
      const baseEnv = Math.min(attack, decay);
      const noise = 0.3 + rand() * 0.7;
      const h = Math.max(1, maxH * baseEnv * noise * clip.volume);
      ctx.fillRect(x, midY - h / 2, w, h);
    }
  }, [width, height, clip.id, clip.volume, themeColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-1/2 left-0 -translate-y-1/2"
      style={{ paddingLeft: 3 }}
    />
  );
}
