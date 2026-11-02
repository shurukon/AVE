"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePalmier, formatTimecode } from "@/lib/palmier/store";
import { Clip, defaultColorGrade } from "@/lib/palmier/types";
import {
  Play, Pause, Volume2, VolumeMute, Maximize, Minimize,
  ImageIcon, Move, Rotate, Crop, Activity, ChevronLeft, ChevronRight,
} from "@/components/palmier/icons";
import { cn } from "@/lib/utils";

export function PreviewPanel() {
  const project = usePalmier((s) => s.project);
  const isPlaying = usePalmier((s) => s.isPlaying);
  const setPlaying = usePalmier((s) => s.setPlaying);
  const setPlayhead = usePalmier((s) => s.setPlayhead);
  const selectedClipIds = usePalmier((s) => s.selectedClipIds);
  const showScopes = usePalmier((s) => s.showScopes);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transformMode, setTransformMode] = useState<"none" | "move" | "crop">("none");
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const totalDuration = project.clips.length
    ? Math.max(...project.clips.map((c) => c.start + c.duration))
    : 0;

  const activeClips = useMemo(() => {
    return project.clips.filter(
      (c) => c.start <= project.playhead && c.start + c.duration > project.playhead,
    );
  }, [project.clips, project.playhead]);

  const activeVideoClip = activeClips.find((c) => c.type === "video" || c.type === "image");
  const activeTextClips = activeClips.filter((c) => c.type === "text");
  const activeAudioClips = activeClips.filter((c) => c.type === "audio");

  const selectedClip = project.clips.find((c) => selectedClipIds.includes(c.id));

  const videoSourceTime = activeVideoClip
    ? activeVideoClip.sourceStart +
      (project.playhead - activeVideoClip.start) * (activeVideoClip.speed || 1)
    : 0;

  const getVideoEl = useCallback((clip: Clip): HTMLVideoElement | null => {
    if (!clip.mediaId) return null;
    const media = project.media.find((m) => m.id === clip.mediaId);
    if (!media) return null;
    let el = videoElsRef.current.get(clip.id);
    if (!el) {
      el = document.createElement("video");
      el.src = media.url;
      el.crossOrigin = "anonymous";
      el.muted = true;
      el.playsInline = true;
      el.preload = "auto";
      videoElsRef.current.set(clip.id, el);
    }
    return el;
  }, [project.media]);

  const getAudioEl = useCallback((clip: Clip): HTMLAudioElement | null => {
    if (!clip.mediaId) return null;
    const media = project.media.find((m) => m.id === clip.mediaId);
    if (!media) return null;
    let el = audioElsRef.current.get(clip.id);
    if (!el) {
      el = document.createElement("audio");
      el.src = media.url;
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      audioElsRef.current.set(clip.id, el);
    }
    return el;
  }, [project.media]);

  const applyColorGrade = (ctx: CanvasRenderingContext2D, grade: Clip["colorGrade"]) => {
    if (!grade) return;
    const g = { ...defaultColorGrade, ...grade };
    ctx.filter = [
      `brightness(${1 + g.exposure * 0.5})`,
      `contrast(${1 + g.contrast * 0.5})`,
      `saturate(${1 + g.saturation * 0.8})`,
      `hue-rotate(${(g.temperature * 15).toFixed(1)}deg)`,
      `sepia(${Math.max(0, g.temperature * 0.2).toFixed(2)})`,
      g.clarity > 0 ? `contrast(${1 + g.clarity * 0.2})` : "",
    ].filter(Boolean).join(" ");
  };

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.fillStyle = project.settings.backgroundColor || "#000";
    ctx.fillRect(0, 0, w, h);

    if (activeVideoClip) {
      const media = project.media.find((m) => m.id === activeVideoClip.mediaId);
      if (!media) return;
      ctx.save();
      applyColorGrade(ctx, activeVideoClip.colorGrade);

      const tx = (activeVideoClip.transform.x / 100) * w;
      const ty = (activeVideoClip.transform.y / 100) * h;
      ctx.translate(w / 2 + tx, h / 2 + ty);
      ctx.rotate((activeVideoClip.transform.rotation * Math.PI) / 180);
      ctx.scale(activeVideoClip.transform.scale, activeVideoClip.transform.scale);
      ctx.globalAlpha = activeVideoClip.transform.opacity;

      const crop = activeVideoClip.crop;
      const cropL = crop.left * (media.width || w);
      const cropR = crop.right * (media.width || w);
      const cropT = crop.top * (media.height || h);
      const cropB = crop.bottom * (media.height || h);

      if (activeVideoClip.type === "image") {
        const img = new Image();
        img.src = media.url;
        if (img.complete) {
          drawContain(ctx, img, img.naturalWidth - cropL - cropR, img.naturalHeight - cropT - cropB, w, h, cropL, cropT);
        } else {
          img.onload = () =>
            drawContain(ctx, img, img.naturalWidth - cropL - cropR, img.naturalHeight - cropT - cropB, w, h, cropL, cropT);
        }
      } else {
        const v = getVideoEl(activeVideoClip);
        if (v && v.readyState >= 2) {
          drawContain(ctx, v, v.videoWidth - cropL - cropR, v.videoHeight - cropT - cropB, w, h, cropL, cropT);
        }
      }
      ctx.restore();
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }

    // Text overlays
    for (const tc of activeTextClips) {
      const style = tc.textStyle;
      const text = tc.text ?? "";
      if (!text) continue;
      ctx.save();
      const fontPx = (style?.fontSize ?? 64) * (Math.min(w, h) / 1080);
      ctx.font = `${style?.italic ? "italic " : ""}${style?.fontWeight ?? 700} ${fontPx}px ${style?.fontFamily ?? "sans-serif"}`;
      ctx.fillStyle = style?.color ?? "#ffffff";
      ctx.textAlign = (style?.align as CanvasTextAlign) ?? "center";
      ctx.textBaseline = "middle";
      const cx = style?.align === "left" ? w * 0.1 : style?.align === "right" ? w * 0.9 : w / 2;
      const cy = (style?.positionY ?? 0.9) * h;

      let displayText = text;
      if (style?.case === "upper") displayText = text.toUpperCase();
      else if (style?.case === "lower") displayText = text.toLowerCase();
      else if (style?.case === "title") displayText = text.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

      if (style?.background) {
        const metrics = ctx.measureText(displayText);
        const bw = metrics.width + 24;
        const bh = fontPx * 1.4;
        ctx.fillStyle = style.background;
        ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
        ctx.fillStyle = style.color ?? "#ffffff";
      }
      ctx.fillText(displayText, cx, cy);
      ctx.restore();
    }
  };

  const drawContain = (
    ctx: CanvasRenderingContext2D,
    src: CanvasImageSource,
    sw: number, sh: number,
    dw: number, dh: number,
    cropL = 0, cropT = 0,
  ) => {
    if (!sw || !sh) return;
    const sAspect = sw / sh;
    const dAspect = dw / dh;
    let renderW = dw;
    let renderH = dh;
    let offsetX = 0;
    let offsetY = 0;
    if (sAspect > dAspect) {
      renderH = dw / sAspect;
      offsetY = (dh - renderH) / 2;
    } else {
      renderW = dh * sAspect;
      offsetX = (dw - renderW) / 2;
    }
    try {
      ctx.drawImage(src, cropL, cropT, sw, sh, offsetX, offsetY, renderW, renderH);
    } catch { /* not ready */ }
  };

  useEffect(() => {
    if (!activeVideoClip) return;
    if (activeVideoClip.type !== "video") return;
    const v = getVideoEl(activeVideoClip);
    if (!v) return;
    const target = videoSourceTime;
    if (Math.abs(v.currentTime - target) > 0.05) {
      try { v.currentTime = target; } catch { /* ignore */ }
    }
  }, [videoSourceTime, activeVideoClip?.id, getVideoEl]);

  useEffect(() => {
    if (!isPlaying) drawFrame();
  }, [project.playhead, activeVideoClip?.id, activeTextClips.length]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      videoElsRef.current.forEach((v) => v.pause());
      audioElsRef.current.forEach((a) => a.pause());
      return;
    }
    lastTickRef.current = performance.now();

    if (activeVideoClip?.type === "video") {
      const v = getVideoEl(activeVideoClip);
      if (v) {
        v.muted = true;
        try { v.currentTime = videoSourceTime; } catch { /* ignore */ }
        void v.play().catch(() => {});
      }
    }
    for (const ac of activeAudioClips) {
      const a = getAudioEl(ac);
      if (a) {
        a.volume = Math.min(1, Math.max(0, (ac.volume ?? 1) * volume));
        a.muted = muted;
        try {
          a.currentTime = ac.sourceStart + (project.playhead - ac.start) * (ac.speed || 1);
        } catch { /* ignore */ }
        void a.play().catch(() => {});
      }
    }

    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      const next = usePalmier.getState().project.playhead + dt;
      if (next >= totalDuration) {
        setPlayhead(totalDuration);
        setPlaying(false);
        return;
      }
      setPlayhead(next);
      drawFrame();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      videoElsRef.current.forEach((v) => v.pause());
      audioElsRef.current.forEach((a) => a.pause());
    };
  }, [isPlaying, activeVideoClip?.id, activeAudioClips.length, muted, volume, getVideoEl, getAudioEl, totalDuration, videoSourceTime, project.playhead]);

  useEffect(() => {
    audioElsRef.current.forEach((a) => {
      a.muted = muted;
      a.volume = volume;
    });
  }, [muted, volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = project.settings.width;
    canvas.height = project.settings.height;
    drawFrame();
  }, [project.settings.width, project.settings.height]);

  const onScrub = (v: number[]) => {
    setPlaying(false);
    setPlayhead(v[0]);
  };

  const toggleFullscreen = () => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      void el.requestFullscreen?.();
      setIsFullscreen(true);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)]">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-3">
        <div className="flex h-full w-full gap-3">
          {/* Canvas */}
          <div className="relative flex flex-1 items-center justify-center">
            <div className="relative max-h-full max-w-full">
              <canvas
                ref={canvasRef}
                className="rounded shadow-2xl"
                style={{ background: "#000", maxHeight: "100%", maxWidth: "100%" }}
              />

              {selectedClip && transformMode === "move" ? (
                <TransformOverlay clip={selectedClip} />
              ) : null}
              {selectedClip && transformMode === "crop" ? (
                <CropOverlay clip={selectedClip} canvasRef={canvasRef} />
              ) : null}

              {!activeVideoClip && activeTextClips.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                  <ImageIcon size={32} className="opacity-40 mb-2" />
                  <div className="text-[11px]">Drop media on the timeline to preview</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Scopes panel */}
          {showScopes ? (
            <aside className="flex w-56 flex-col gap-2 overflow-y-auto">
              <div className="panel-header">
                <Activity size={11} />
                <span className="panel-header-title ml-2">Scopes</span>
              </div>
              <Histogram canvasRef={canvasRef} />
              <WaveformMonitor canvasRef={canvasRef} />
              <Vectorscope canvasRef={canvasRef} />
            </aside>
          ) : null}
        </div>
      </div>

      {/* Transport bar */}
      <div className="border-t border-[var(--border-primary)] bg-[var(--bg-raised)] px-4 py-2">
        <div className="mb-2 flex items-center gap-3">
          <button
            onClick={() => setPlaying(!isPlaying)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition hover:bg-[#F5EFE4]"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <div className="timecode-readout text-[11px]">
            {formatTimecode(project.playhead, project.settings.fps)}
          </div>
          <div className="text-[11px] font-mono text-[var(--text-tertiary)] tabular">
            / {formatTimecode(totalDuration, project.settings.fps)}
          </div>

          {selectedClip ? (
            <div className="flex items-center gap-0.5 ml-2 rounded bg-black/30 p-0.5">
              <button className={cn("tool-btn h-6 w-6", transformMode === "none" && "is-active")}
                onClick={() => setTransformMode("none")} title="No overlay">
                <Move size={11} />
              </button>
              <button className={cn("tool-btn h-6 w-6", transformMode === "move" && "is-active")}
                onClick={() => setTransformMode("move")} title="Transform handles">
                <Rotate size={11} />
              </button>
              <button className={cn("tool-btn h-6 w-6", transformMode === "crop" && "is-active")}
                onClick={() => setTransformMode("crop")} title="Crop overlay">
                <Crop size={11} />
              </button>
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <button className="text-[var(--text-tertiary)] hover:text-white transition"
              onClick={() => setMuted(!muted)} title={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeMute size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range" min={0} max={100} value={muted ? 0 : volume * 100}
              onChange={(e) => {
                setVolume(Number(e.target.value) / 100);
                setMuted(e.target.value === "0");
              }}
              className="palmier-range w-24"
            />
            <button className="text-[var(--text-tertiary)] hover:text-white transition"
              onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>
        </div>
        {/* Scrub bar */}
        <div className="relative h-3 flex items-center">
          <div className="absolute inset-x-0 h-1 bg-[var(--bg-prominent)] rounded-full" />
          <div className="absolute left-0 h-1 bg-[var(--accent-warm)] rounded-full"
            style={{ width: `${totalDuration > 0 ? (project.playhead / totalDuration) * 100 : 0}%` }} />
          <input
            type="range" min={0} max={Math.max(totalDuration, 1)} step={0.01}
            value={project.playhead}
            onChange={(e) => onScrub([Number(e.target.value)])}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
          <div className="absolute h-3 w-3 rounded-full bg-[var(--accent-warm)] border border-black pointer-events-none transition-transform hover:scale-110"
            style={{ left: `calc(${totalDuration > 0 ? (project.playhead / totalDuration) * 100 : 0}% - 6px)` }} />
        </div>
      </div>
    </div>
  );
}

function TransformOverlay({ clip }: { clip: Clip }) {
  const setClipProperties = usePalmier((s) => s.setClipProperties);
  const dragRef = useRef<{ startX: number; startScale: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const newScale = Math.max(0.1, d.startScale + dx / 200);
      setClipProperties(clip.id, { transform: { ...clip.transform, scale: newScale } });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [clip, setClipProperties]);

  const corners = [
    { x: 0, y: 0, cursor: "nwse-resize" },
    { x: 1, y: 0, cursor: "nesw-resize" },
    { x: 0, y: 1, cursor: "nesw-resize" },
    { x: 1, y: 1, cursor: "nwse-resize" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute"
        style={{
          left: "10%", right: "10%", top: "10%", bottom: "10%",
          border: "1.5px solid rgba(242, 153, 51, 0.7)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
        }} />
      {corners.map((c, i) => (
        <div key={`c${i}`} className="pointer-events-auto absolute h-3 w-3 bg-[#F29933] border border-black"
          style={{
            left: `calc(${c.x * 80 + 10}% - 6px)`,
            top: `calc(${c.y * 80 + 10}% - 6px)`,
            cursor: c.cursor,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            dragRef.current = { startX: e.clientX, startY: e.clientY, startScale: clip.transform.scale };
          }}
        />
      ))}
    </div>
  );
}

function CropOverlay({ clip, canvasRef }: { clip: Clip; canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const setClipProperties = usePalmier((s) => s.setClipProperties);
  const [dragSide, setDragSide] = useState<"top" | "bottom" | "left" | "right" | null>(null);
  const dragStart = useRef<{ pos: number; value: number; side: "top" | "bottom" | "left" | "right" } | null>(null);

  useEffect(() => {
    if (!dragSide) return;
    const onMove = (e: MouseEvent) => {
      const d = dragStart.current;
      if (!d) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isVertical = d.side === "left" || d.side === "right";
      const delta = isVertical
        ? (e.clientX - d.pos) / rect.width
        : (e.clientY - d.pos) / rect.height;
      const v = Math.max(0, Math.min(0.5, d.value + delta));
      setClipProperties(clip.id, { crop: { ...clip.crop, [d.side]: v } });
    };
    const onUp = () => { setDragSide(null); dragStart.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragSide, clip, setClipProperties, canvasRef]);

  const crop = clip.crop;
  const topPct = crop.top * 100;
  const botPct = (1 - crop.bottom) * 100;
  const leftPct = crop.left * 100;
  const rightPct = (1 - crop.right) * 100;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-black/50"
        style={{
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${leftPct}% ${topPct}%, ${leftPct}% ${botPct}%, ${rightPct}% ${botPct}%, ${rightPct}% ${topPct}%, ${leftPct}% ${topPct}%)`,
        }} />
      <div className="absolute border-2 border-[#F29933]"
        style={{
          left: `${leftPct}%`, top: `${topPct}%`,
          right: `${100 - rightPct}%`, bottom: `${100 - botPct}%`,
        }}>
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
      </div>
      {(["top", "bottom", "left", "right"] as const).map((side) => (
        <div key={side} className="pointer-events-auto absolute bg-[#F29933] border border-black"
          style={{
            ...(side === "top" ? { left: `${leftPct}%`, right: `${100 - rightPct}%`, top: `${topPct - 1}%`, height: "4px", cursor: "ns-resize" } : {}),
            ...(side === "bottom" ? { left: `${leftPct}%`, right: `${100 - rightPct}%`, top: `${botPct - 1}%`, height: "4px", cursor: "ns-resize" } : {}),
            ...(side === "left" ? { top: `${topPct}%`, bottom: `${100 - botPct}%`, left: `${leftPct - 1}%`, width: "4px", cursor: "ew-resize" } : {}),
            ...(side === "right" ? { top: `${topPct}%`, bottom: `${100 - botPct}%`, left: `${rightPct - 1}%`, width: "4px", cursor: "ew-resize" } : {}),
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setDragSide(side);
            const isVertical = side === "left" || side === "right";
            dragStart.current = {
              pos: isVertical ? e.clientX : e.clientY,
              value: clip.crop[side], side,
            };
          }} />
      ))}
    </div>
  );
}

function Histogram({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const histRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const source = canvasRef.current;
      const target = histRef.current;
      if (!source || !target) return;
      const ctx = target.getContext("2d");
      if (!ctx) return;
      const W = target.width;
      const H = target.height;
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);
      try {
        const sCtx = source.getContext("2d");
        if (!sCtx) return;
        const data = sCtx.getImageData(0, 0, source.width, source.height).data;
        const r = new Array(64).fill(0);
        const g = new Array(64).fill(0);
        const b = new Array(64).fill(0);
        const step = Math.max(1, Math.floor(data.length / 4 / 5000));
        for (let i = 0; i < data.length; i += 4 * step) {
          r[Math.floor((data[i] / 256) * 64)]++;
          g[Math.floor((data[i + 1] / 256) * 64)]++;
          b[Math.floor((data[i + 2] / 256) * 64)]++;
        }
        const max = Math.max(...r, ...g, ...b, 1);
        const drawChannel = (arr: number[], color: string) => {
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          arr.forEach((v, i) => {
            const x = (i / 64) * W;
            const y = H - (v / max) * H;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };
        drawChannel(r, "#FF3A2E");
        drawChannel(g, "#52D15C");
        drawChannel(b, "#528FFF");
        ctx.globalAlpha = 1;
      } catch { /* not ready */ }
    }, 200);
    return () => clearInterval(id);
  }, [canvasRef]);
  return (
    <div>
      <div className="section-title mb-1.5">Histogram (RGB)</div>
      <canvas ref={histRef} width={210} height={80} className="scope-canvas w-full" />
    </div>
  );
}

function WaveformMonitor({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const wfRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const source = canvasRef.current;
      const target = wfRef.current;
      if (!source || !target) return;
      const ctx = target.getContext("2d");
      if (!ctx) return;
      const W = target.width;
      const H = target.height;
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);
      try {
        const sCtx = source.getContext("2d");
        if (!sCtx) return;
        const data = sCtx.getImageData(0, 0, source.width, source.height).data;
        ctx.fillStyle = "rgba(245, 239, 228, 0.5)";
        const step = Math.max(1, Math.floor(data.length / 4 / 5000));
        for (let i = 0; i < data.length; i += 4 * step) {
          const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          const x = ((i / 4 / step) % (source.width / step)) / (source.width / step) * W;
          const y = H - lum * H;
          ctx.fillRect(x, y, 1, 1);
        }
      } catch { /* not ready */ }
    }, 200);
    return () => clearInterval(id);
  }, [canvasRef]);
  return (
    <div>
      <div className="section-title mb-1.5">Waveform (Luma)</div>
      <canvas ref={wfRef} width={210} height={80} className="scope-canvas w-full" />
    </div>
  );
}

function Vectorscope({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const vsRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const source = canvasRef.current;
      const target = vsRef.current;
      if (!source || !target) return;
      const ctx = target.getContext("2d");
      if (!ctx) return;
      const W = target.width;
      const H = target.height;
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      try {
        const sCtx = source.getContext("2d");
        if (!sCtx) return;
        const data = sCtx.getImageData(0, 0, source.width, source.height).data;
        ctx.fillStyle = "rgba(245, 239, 228, 0.5)";
        const step = Math.max(1, Math.floor(data.length / 4 / 3000));
        for (let i = 0; i < data.length; i += 4 * step) {
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          const cb = (b - 0.5) * 1.5;
          const cr = (r - 0.5) * 1.5;
          const x = W / 2 + cb * (W / 2 - 2);
          const y = H / 2 + cr * (H / 2 - 2);
          ctx.fillRect(x, y, 1, 1);
        }
      } catch { /* not ready */ }
    }, 200);
    return () => clearInterval(id);
  }, [canvasRef]);
  return (
    <div>
      <div className="section-title mb-1.5">Vectorscope</div>
      <canvas ref={vsRef} width={210} height={140} className="scope-canvas w-full" />
    </div>
  );
}
