"use client";

import { useState, useRef, useEffect } from "react";
import { usePalmier } from "@/lib/palmier/store";
import {
  Clip, Effect, EffectKind, Project, ColorGrade,
  defaultTextStyle,
} from "@/lib/palmier/types";
import {
  Sliders, TextGlyph, Volume2, Sparkles, Settings, Wand2, Palette,
  Sun, Contrast, Droplet, Layers, Crop, ChevronDown, ChevronRight,
  Plus, Trash2, Eye, EyeOff, Move, Rotate, Check,
} from "@/components/palmier/icons";
import { cn } from "@/lib/utils";

const EFFECT_CATALOG: { kind: EffectKind; label: string; icon: React.ReactNode; group: string }[] = [
  { kind: "color.exposure", label: "Exposure", icon: <Sun size={11} />, group: "Color" },
  { kind: "color.contrast", label: "Contrast", icon: <Contrast size={11} />, group: "Color" },
  { kind: "color.saturation", label: "Saturation", icon: <Droplet size={11} />, group: "Color" },
  { kind: "color.temperature", label: "Temperature", icon: <Sun size={11} />, group: "Color" },
  { kind: "color.highlightsShadows", label: "Highlights/Shadows", icon: <Sliders size={11} />, group: "Color" },
  { kind: "color.blacksWhites", label: "Blacks/Whites", icon: <Sliders size={11} />, group: "Color" },
  { kind: "color.vibrance", label: "Vibrance", icon: <Palette size={11} />, group: "Color" },
  { kind: "color.wheels", label: "Color Wheels", icon: <Palette size={11} />, group: "Color" },
  { kind: "color.curves", label: "Curves", icon: <Sliders size={11} />, group: "Color" },
  { kind: "color.hueCurves", label: "Hue Curves", icon: <Sliders size={11} />, group: "Color" },
  { kind: "color.lut", label: "LUT", icon: <Layers size={11} />, group: "Color" },
  { kind: "detail.clarity", label: "Clarity / Dehaze", icon: <Sliders size={11} />, group: "Detail" },
  { kind: "blur.gaussian", label: "Gaussian Blur", icon: <Sparkles size={11} />, group: "Blur" },
  { kind: "blur.sharpen", label: "Sharpen", icon: <Sparkles size={11} />, group: "Blur" },
  { kind: "blur.noiseReduction", label: "Noise Reduction", icon: <Sparkles size={11} />, group: "Blur" },
  { kind: "blur.motion", label: "Motion Blur", icon: <Sparkles size={11} />, group: "Blur" },
  { kind: "stylize.grain", label: "Grain", icon: <Sparkles size={11} />, group: "Stylize" },
  { kind: "stylize.vignette", label: "Vignette", icon: <Sparkles size={11} />, group: "Stylize" },
  { kind: "stylize.glow", label: "Glow", icon: <Sparkles size={11} />, group: "Stylize" },
  { kind: "key.chroma", label: "Chroma Key", icon: <Sparkles size={11} />, group: "Key" },
];

export function Inspector() {
  const project = usePalmier((s) => s.project);
  const selectedClipIds = usePalmier((s) => s.selectedClipIds);
  const setClipProperties = usePalmier((s) => s.setClipProperties);
  const setProjectSettings = usePalmier((s) => s.setProjectSettings);
  const setColorGrade = usePalmier((s) => s.setColorGrade);
  const addEffect = usePalmier((s) => s.addEffect);
  const removeEffect = usePalmier((s) => s.removeEffect);
  const toggleEffect = usePalmier((s) => s.toggleEffect);
  const setEffectParam = usePalmier((s) => s.setEffectParam);

  const clip = project.clips.find((c) => c.id === selectedClipIds[0]) ?? null;

  return (
    <div className="flex h-full flex-col bg-[var(--bg-surface)]">
      <div className="panel-header">
        <Sliders size={11} />
        <span className="panel-header-title ml-2">Inspector</span>
      </div>
      {clip ? (
        <ClipInspector
          clip={clip}
          onPatch={(p) => setClipProperties(clip.id, p)}
          onGrade={(p) => setColorGrade(clip.id, p)}
          onAddEffect={(k) => addEffect(clip.id, k)}
          onRemoveEffect={(id) => removeEffect(clip.id, id)}
          onToggleEffect={(id) => toggleEffect(clip.id, id)}
          onEffectParam={(id, k, v) => setEffectParam(clip.id, id, k, v)}
        />
      ) : (
        <ProjectInspector settings={project.settings} onPatch={(p) => setProjectSettings(p)} />
      )}
    </div>
  );
}

function ProjectInspector({ settings, onPatch }: { settings: Project["settings"]; onPatch: (p: Partial<Project["settings"]>) => void }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <Section title="Project Settings" icon={<Settings size={9} />}>
        <Row label="Name">
          <input value={settings.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            className="num-input flex-1 text-left" />
        </Row>
        <Row label="Resolution">
          <div className="flex gap-1 flex-1">
            <input type="number" value={settings.width}
              onChange={(e) => onPatch({ width: Number(e.target.value) || 1920 })}
              className="num-input flex-1 text-left" />
            <span className="text-[var(--text-muted)] self-center">×</span>
            <input type="number" value={settings.height}
              onChange={(e) => onPatch({ height: Number(e.target.value) || 1080 })}
              className="num-input flex-1 text-left" />
          </div>
        </Row>
        <Row label="Frame Rate">
          <div className="flex gap-1 flex-1">
            {[24, 25, 30, 50, 60].map((f) => (
              <button key={f}
                onClick={() => onPatch({ fps: f })}
                className={cn("flex-1 h-[22px] rounded text-[10px] font-medium transition",
                  settings.fps === f
                    ? "bg-[var(--accent-warm)] text-black"
                    : "bg-white/5 text-[var(--text-tertiary)] hover:bg-white/10")}>
                {f}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Background">
          <div className="flex items-center gap-2 flex-1">
            <input type="color" value={settings.backgroundColor}
              onChange={(e) => onPatch({ backgroundColor: e.target.value })}
              className="h-[22px] w-8 rounded border border-[var(--border-subtle)] bg-transparent" />
            <input value={settings.backgroundColor}
              onChange={(e) => onPatch({ backgroundColor: e.target.value })}
              className="num-input flex-1 text-left" />
          </div>
        </Row>
      </Section>

      <div className="px-3.5 py-4">
        <div className="rounded-md border border-[var(--border-subtle)] bg-white/[0.02] p-3 text-[11px] text-[var(--text-tertiary)]">
          <div className="font-medium text-white mb-1">No clip selected</div>
          Click a clip on the timeline to edit its properties.
        </div>
      </div>
    </div>
  );
}

function ClipInspector({
  clip, onPatch, onGrade, onAddEffect, onRemoveEffect, onToggleEffect, onEffectParam,
}: {
  clip: Clip;
  onPatch: (p: Partial<Clip>) => void;
  onGrade: (p: Partial<ColorGrade>) => void;
  onAddEffect: (k: EffectKind) => void;
  onRemoveEffect: (id: string) => void;
  onToggleEffect: (id: string) => void;
  onEffectParam: (id: string, k: string, v: number | string | boolean) => void;
}) {
  const isText = clip.type === "text" || clip.type === "caption";
  const isAudio = clip.type === "audio";
  const isVideo = clip.type === "video" || clip.type === "image";
  const [tab, setTab] = useState<"adjust" | "color" | "effects" | "text" | "audio">("adjust");

  return (
    <>
      <div className="inspector-tab-bar">
        <button className={cn("tab-underline", tab === "adjust" && "is-active")} onClick={() => setTab("adjust")}>
          Adjust
        </button>
        <button className={cn("tab-underline", tab === "color" && "is-active", !isVideo && "opacity-30")}
          onClick={() => isVideo && setTab("color")} disabled={!isVideo}>
          Color
        </button>
        <button className={cn("tab-underline", tab === "effects" && "is-active", !isVideo && "opacity-30")}
          onClick={() => isVideo && setTab("effects")} disabled={!isVideo}>
          Effects
        </button>
        <button className={cn("tab-underline", tab === "text" && "is-active", !isText && "opacity-30")}
          onClick={() => isText && setTab("text")} disabled={!isText}>
          Text
        </button>
        <button className={cn("tab-underline", tab === "audio" && "is-active", isAudio && "opacity-30")}
          onClick={() => (isAudio || isVideo) && setTab("audio")} disabled={!isAudio && !isVideo}>
          Audio
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "adjust" ? (
          <>
            <Section title="Transform" icon={<Move size={9} />}>
              <Row label="Position X">
                <NumberInput value={clip.transform.x}
                  onChange={(v) => onPatch({ transform: { ...clip.transform, x: v } })} />
              </Row>
              <Row label="Position Y">
                <NumberInput value={clip.transform.y}
                  onChange={(v) => onPatch({ transform: { ...clip.transform, y: v } })} />
              </Row>
              <SliderRow label="Scale" value={clip.transform.scale} min={0.1} max={5} step={0.01}
                onChange={(v) => onPatch({ transform: { ...clip.transform, scale: v } })} />
              <SliderRow label="Rotation" value={clip.transform.rotation} min={-180} max={180} step={1} unit="°"
                onChange={(v) => onPatch({ transform: { ...clip.transform, rotation: v } })} />
              <SliderRow label="Opacity" value={clip.transform.opacity} min={0} max={1} step={0.01}
                onChange={(v) => onPatch({ transform: { ...clip.transform, opacity: v } })} />
            </Section>

            {isVideo ? (
              <Section title="Crop" icon={<Crop size={9} />}>
                <SliderRow label="Top" value={clip.crop.top} min={0} max={0.5} step={0.01}
                  onChange={(v) => onPatch({ crop: { ...clip.crop, top: v } })} />
                <SliderRow label="Bottom" value={clip.crop.bottom} min={0} max={0.5} step={0.01}
                  onChange={(v) => onPatch({ crop: { ...clip.crop, bottom: v } })} />
                <SliderRow label="Left" value={clip.crop.left} min={0} max={0.5} step={0.01}
                  onChange={(v) => onPatch({ crop: { ...clip.crop, left: v } })} />
                <SliderRow label="Right" value={clip.crop.right} min={0} max={0.5} step={0.01}
                  onChange={(v) => onPatch({ crop: { ...clip.crop, right: v } })} />
              </Section>
            ) : null}

            <Section title="Timing" icon={<Rotate size={9} />}>
              <SliderRow label="Speed" value={clip.speed} min={0.25} max={4} step={0.05} unit="×"
                onChange={(v) => onPatch({ speed: v })} />
              <SliderRow label="Fade In" value={clip.fadeIn} min={0} max={Math.max(0.1, clip.duration / 2)} step={0.05} unit="s"
                onChange={(v) => onPatch({ fadeIn: v })} />
              <SliderRow label="Fade Out" value={clip.fadeOut} min={0} max={Math.max(0.1, clip.duration / 2)} step={0.05} unit="s"
                onChange={(v) => onPatch({ fadeOut: v })} />
            </Section>

            <Section title="Clip Color">
              <Row label="Color">
                <div className="flex items-center gap-2 flex-1">
                  <input type="color" value={clip.color ?? "#3a6ea5"}
                    onChange={(e) => onPatch({ color: e.target.value })}
                    className="h-[22px] w-8 rounded border border-[var(--border-subtle)] bg-transparent" />
                  <input value={clip.color ?? ""}
                    onChange={(e) => onPatch({ color: e.target.value })}
                    className="num-input flex-1 text-left" />
                </div>
              </Row>
            </Section>

            <div className="px-3.5 py-2 text-[10px] text-[var(--text-muted)]">
              ID: <span className="font-mono">{clip.id}</span>
            </div>
          </>
        ) : null}

        {tab === "color" ? (
          <ColorGradePanel grade={clip.colorGrade} onPatch={onGrade} />
        ) : null}

        {tab === "effects" ? (
          <EffectsPanel clip={clip} onAddEffect={onAddEffect} onRemoveEffect={onRemoveEffect}
            onToggleEffect={onToggleEffect} onEffectParam={onEffectParam} />
        ) : null}

        {tab === "text" ? (
          <TextPanel clip={clip} onPatch={onPatch} />
        ) : null}

        {tab === "audio" ? (
          <>
            <Section title="Audio" icon={<Volume2 size={9} />}>
              <SliderRow label="Volume" value={clip.volume} min={0} max={2} step={0.05} unit="×"
                onChange={(v) => onPatch({ volume: v })} />
              <SliderRow label="Fade In" value={clip.fadeIn} min={0} max={Math.max(0.1, clip.duration / 2)} step={0.05} unit="s"
                onChange={(v) => onPatch({ fadeIn: v })} />
              <SliderRow label="Fade Out" value={clip.fadeOut} min={0} max={Math.max(0.1, clip.duration / 2)} step={0.05} unit="s"
                onChange={(v) => onPatch({ fadeOut: v })} />
            </Section>
            <Section title="AI Audio">
              <div className="rounded-md border border-[var(--border-subtle)] bg-white/[0.02] p-3 text-[11px] text-[var(--text-tertiary)]">
                <div className="mb-1 flex items-center gap-2 font-medium text-white">
                  <Sparkles size={11} /> Audio Sync
                </div>
                Use the Agent panel to ask for automatic audio alignment.
                Calls the <code className="font-mono text-[var(--accent-timecode)]">sync_audio</code> MCP tool.
              </div>
            </Section>
          </>
        ) : null}
      </div>
    </>
  );
}

function ColorGradePanel({ grade, onPatch }: { grade: ColorGrade; onPatch: (p: Partial<ColorGrade>) => void }) {
  return (
    <>
      <Section title="Basic Correction" icon={<Sun size={9} />}>
        <SliderRow label="Exposure" value={grade.exposure} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ exposure: v })} />
        <SliderRow label="Contrast" value={grade.contrast} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ contrast: v })} />
        <SliderRow label="Highlights" value={grade.highlights} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ highlights: v })} />
        <SliderRow label="Shadows" value={grade.shadows} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ shadows: v })} />
        <SliderRow label="Whites" value={grade.whites} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ whites: v })} />
        <SliderRow label="Blacks" value={grade.blacks} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ blacks: v })} />
      </Section>

      <Section title="White Balance" icon={<Droplet size={9} />}>
        <GradientSlider label="Temperature" value={grade.temperature}
          gradient="linear-gradient(to right, #528CEB, #F3B851)"
          onChange={(v) => onPatch({ temperature: v })} />
        <GradientSlider label="Tint" value={grade.tint}
          gradient="linear-gradient(to right, #6BC773, #D261B8)"
          onChange={(v) => onPatch({ tint: v })} />
      </Section>

      <Section title="Saturation">
        <SliderRow label="Saturation" value={grade.saturation} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ saturation: v })} />
        <SliderRow label="Vibrance" value={grade.vibrance} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ vibrance: v })} />
      </Section>

      <Section title="Color Wheels" icon={<Palette size={9} />}>
        <div className="grid grid-cols-3 gap-2 pb-2">
          <ColorWheel label="Lift"
            hue={grade.liftHue} sat={grade.liftSat} luma={grade.liftLuma}
            onChange={(h, s, l) => onPatch({ liftHue: h, liftSat: s, liftLuma: l })} />
          <ColorWheel label="Gamma"
            hue={grade.gammaHue} sat={grade.gammaSat} luma={grade.gammaLuma}
            onChange={(h, s, l) => onPatch({ gammaHue: h, gammaSat: s, gammaLuma: l })} />
          <ColorWheel label="Gain"
            hue={grade.gainHue} sat={grade.gainSat} luma={grade.gainLuma}
            onChange={(h, s, l) => onPatch({ gainHue: h, gainSat: s, gainLuma: l })} />
        </div>
      </Section>

      <Section title="Detail">
        <SliderRow label="Clarity" value={grade.clarity} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ clarity: v })} />
        <SliderRow label="Dehaze" value={grade.dehaze} min={-1} max={1} step={0.01}
          onChange={(v) => onPatch({ dehaze: v })} />
      </Section>
    </>
  );
}

function ColorWheel({
  label, hue, sat, luma, onChange,
}: {
  label: string;
  hue: number;
  sat: number;
  luma: number;
  onChange: (hue: number, sat: number, luma: number) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointer = (e: React.MouseEvent | MouseEvent) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const r = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy) / r;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    onChange(((angle + 360) % 360), Math.min(1, dist), luma);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handlePointer(e);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, luma, onChange]);

  const puckX = 50 + Math.cos((hue * Math.PI) / 180) * sat * 50;
  const puckY = 50 + Math.sin((hue * Math.PI) / 180) * sat * 50;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div ref={padRef} className="color-wheel-pad"
        onMouseDown={(e) => { setDragging(true); handlePointer(e); }}>
        <div className="puck" style={{ left: `${puckX}%`, top: `${puckY}%` }} />
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--text-muted)]">{label}</div>
      <input type="range" min={-1} max={1} step={0.01} value={luma}
        onChange={(e) => onChange(hue, sat, Number(e.target.value))}
        className="palmier-range w-full" />
    </div>
  );
}

function GradientSlider({
  label, value, gradient, onChange,
}: {
  label: string; value: number; gradient: string; onChange: (v: number) => void;
}) {
  return (
    <div className="inspector-row">
      <div className="inspector-row-label">{label}</div>
      <div className="flex-1 relative h-[22px] flex items-center">
        <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: gradient }} />
        <input type="range" min={-1} max={1} step={0.01} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="palmier-range w-full relative"
          style={{ background: "transparent" }} />
      </div>
      <div className="inspector-row-value">{value.toFixed(2)}</div>
    </div>
  );
}

function EffectsPanel({
  clip, onAddEffect, onRemoveEffect, onToggleEffect, onEffectParam,
}: {
  clip: Clip;
  onAddEffect: (k: EffectKind) => void;
  onRemoveEffect: (id: string) => void;
  onToggleEffect: (id: string) => void;
  onEffectParam: (id: string, k: string, v: number | string | boolean) => void;
}) {
  const [showCatalog, setShowCatalog] = useState(false);
  const groups = Array.from(new Set(EFFECT_CATALOG.map((e) => e.group)));

  return (
    <>
      <Section title="Applied Effects" icon={<Wand2 size={9} />}>
        {clip.effects.length === 0 ? (
          <div className="text-[11px] text-[var(--text-muted)] py-2">No effects applied yet.</div>
        ) : (
          <div className="space-y-1">
            {clip.effects.map((fx) => (
              <EffectRow key={fx.id} effect={fx}
                onToggle={() => onToggleEffect(fx.id)}
                onRemove={() => onRemoveEffect(fx.id)}
                onParam={(k, v) => onEffectParam(fx.id, k, v)} />
            ))}
          </div>
        )}
        <button onClick={() => setShowCatalog(!showCatalog)}
          className="capsule w-full mt-2">
          <Plus size={10} /> {showCatalog ? "Hide Catalog" : "Add Effect"}
        </button>
      </Section>

      {showCatalog ? (
        <Section title="Effect Catalog">
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <div className="text-[9px] uppercase tracking-[1.5px] text-[var(--text-muted)] mb-1.5">{g}</div>
              <div className="grid grid-cols-2 gap-1">
                {EFFECT_CATALOG.filter((e) => e.group === g).map((e) => (
                  <button key={e.kind} onClick={() => onAddEffect(e.kind)}
                    className="flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-white/[0.02] px-2 py-1.5 text-[10px] hover:border-[var(--border-primary)] transition">
                    {e.icon}
                    <span className="truncate">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Section>
      ) : null}
    </>
  );
}

function EffectRow({
  effect, onToggle, onRemove, onParam,
}: {
  effect: Effect;
  onToggle: () => void;
  onRemove: () => void;
  onParam: (k: string, v: number | string | boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = EFFECT_CATALOG.find((e) => e.kind === effect.kind);

  return (
    <div className="effect-row">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <button onClick={() => setExpanded(!expanded)} className="text-[var(--text-muted)] hover:text-white">
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        {meta?.icon}
        <span className="text-[10px] flex-1 truncate">{meta?.label ?? effect.kind}</span>
        <button onClick={onToggle} className="text-[var(--text-muted)] hover:text-white">
          {effect.enabled ? <Eye size={10} /> : <EyeOff size={10} />}
        </button>
        <button onClick={onRemove} className="text-[var(--text-muted)] hover:text-[var(--status-error)]">
          <Trash2 size={10} />
        </button>
      </div>
      {expanded ? (
        <div className="px-2 py-2 border-t border-[var(--border-subtle)] space-y-2">
          {Object.entries(effect.params).map(([k, v]) => (
            <div key={k}>
              {typeof v === "number" ? (
                <SliderRow label={k.charAt(0).toUpperCase() + k.slice(1)} value={v as number}
                  min={-1} max={1} step={0.01}
                  onChange={(val) => onParam(k, val)} />
              ) : typeof v === "string" ? (
                <Row label={k}>
                  <input value={v as string}
                    onChange={(e) => onParam(k, e.target.value)}
                    className="num-input flex-1 text-left" />
                </Row>
              ) : (
                <Row label={k}>
                  <input type="checkbox" checked={v as boolean}
                    onChange={(e) => onParam(k, e.target.checked)} />
                </Row>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TextPanel({ clip, onPatch }: { clip: Clip; onPatch: (p: Partial<Clip>) => void }) {
  const style = clip.textStyle ?? defaultTextStyle();
  return (
    <>
      <Section title="Text Content" icon={<TextGlyph size={9} />}>
        <textarea
          className="w-full rounded border border-[var(--border-subtle)] bg-white/[0.04] p-2 text-[12px] outline-none focus:border-[var(--accent-warm)] focus:bg-white/[0.06] transition"
          rows={3}
          value={clip.text ?? ""}
          onChange={(e) => onPatch({ text: e.target.value })} />
      </Section>
      <Section title="Typography">
        <Row label="Font">
          <select value={style.fontFamily}
            onChange={(e) => onPatch({ textStyle: { ...style, fontFamily: e.target.value } })}
            className="num-input flex-1 text-left">
            {["Geist, sans-serif", "Inter, sans-serif", "Poppins, sans-serif",
              "serif", "monospace", "Impact, sans-serif",
              "Bebas Neue, sans-serif", "Anton, sans-serif",
              "Caveat, cursive", "Shrikhand, serif"].map((f) => (
              <option key={f} value={f}>{f.split(",")[0]}</option>
            ))}
          </select>
        </Row>
        <Row label="Size">
          <NumberInput value={style.fontSize}
            onChange={(v) => onPatch({ textStyle: { ...style, fontSize: v } })} />
        </Row>
        <Row label="Weight">
          <div className="flex gap-1 flex-1">
            {[400, 500, 600, 700].map((w) => (
              <button key={w}
                onClick={() => onPatch({ textStyle: { ...style, fontWeight: w } })}
                className={cn("flex-1 h-[22px] rounded text-[10px] font-medium transition",
                  style.fontWeight === w
                    ? "bg-[var(--accent-warm)] text-black"
                    : "bg-white/5 text-[var(--text-tertiary)] hover:bg-white/10")}>
                {w}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Style">
          <div className="flex items-center gap-3 flex-1">
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input type="checkbox" checked={style.italic ?? false}
                onChange={(e) => onPatch({ textStyle: { ...style, italic: e.target.checked } })} />
              Italic
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input type="checkbox" checked={style.underline ?? false}
                onChange={(e) => onPatch({ textStyle: { ...style, underline: e.target.checked } })} />
              Underline
            </label>
          </div>
        </Row>
      </Section>
      <Section title="Color">
        <Row label="Color">
          <div className="flex items-center gap-2 flex-1">
            <input type="color" value={style.color}
              onChange={(e) => onPatch({ textStyle: { ...style, color: e.target.value } })}
              className="h-[22px] w-8 rounded border border-[var(--border-subtle)] bg-transparent" />
            <input value={style.color}
              onChange={(e) => onPatch({ textStyle: { ...style, color: e.target.value } })}
              className="num-input flex-1 text-left" />
          </div>
        </Row>
      </Section>
      <Section title="Alignment & Position">
        <Row label="Align">
          <div className="flex gap-1 flex-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a}
                onClick={() => onPatch({ textStyle: { ...style, align: a } })}
                className={cn("flex-1 h-[22px] rounded text-[10px] capitalize transition",
                  style.align === a
                    ? "bg-[var(--accent-warm)] text-black"
                    : "bg-white/5 text-[var(--text-tertiary)] hover:bg-white/10")}>
                {a}
              </button>
            ))}
          </div>
        </Row>
        <SliderRow label="V Position" value={style.positionY ?? 0.9} min={0} max={1} step={0.01}
          onChange={(v) => onPatch({ textStyle: { ...style, positionY: v } })} />
      </Section>
      <Section title="Case">
        <Row label="Case">
          <div className="flex gap-1 flex-1">
            {(["none", "upper", "lower", "title"] as const).map((c) => (
              <button key={c}
                onClick={() => onPatch({ textStyle: { ...style, case: c } })}
                className={cn("flex-1 h-[22px] rounded text-[10px] capitalize transition",
                  style.case === c
                    ? "bg-[var(--accent-warm)] text-black"
                    : "bg-white/5 text-[var(--text-tertiary)] hover:bg-white/10")}>
                {c}
              </button>
            ))}
          </div>
        </Row>
      </Section>
      <Section title="Background">
        <Row label="BG">
          <div className="flex items-center gap-2 flex-1">
            <input type="color" value={style.background ?? "#000000"}
              onChange={(e) => onPatch({ textStyle: { ...style, background: e.target.value } })}
              className="h-[22px] w-8 rounded border border-[var(--border-subtle)] bg-transparent" />
            <input value={style.background ?? ""}
              onChange={(e) => onPatch({ textStyle: { ...style, background: e.target.value } })}
              placeholder="None"
              className="num-input flex-1 text-left" />
          </div>
        </Row>
      </Section>
    </>
  );
}

// ---- Reusable building blocks ----

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="inspector-section">
      <div className="section-title">
        {icon}
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inspector-row">
      <div className="inspector-row-label">{label}</div>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="num-input" />
  );
}

function SliderRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="inspector-row">
      <div className="inspector-row-label">{label}</div>
      <div className="flex-1 relative h-[22px] flex items-center">
        <div className="absolute inset-x-0 h-1 bg-[var(--bg-prominent)] rounded-full" />
        {/* Bipolar fill: track from center */}
        {min < 0 && max > 0 ? (
          <div className="absolute h-1 bg-white/35 rounded-full"
            style={{
              left: value >= 0 ? "50%" : `${50 + (value / Math.abs(min)) * 50}%`,
              right: value >= 0 ? `${50 - (value / Math.abs(max)) * 50}%` : "50%",
            }} />
        ) : (
          <div className="absolute left-0 h-1 bg-white/35 rounded-full"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
        )}
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="palmier-range w-full relative"
          style={{ background: "transparent" }} />
        {/* Custom thumb */}
        <div className="absolute h-3 w-3 rounded-full bg-[var(--accent-warm)] border border-black pointer-events-none"
          style={{
            left: `calc(${((value - min) / (max - min)) * 100}% - 6px)`,
            boxShadow: "0 0.5px 1px rgba(0,0,0,0.3)",
          }} />
      </div>
      <div className="inspector-row-value">{value.toFixed(2)}{unit ?? ""}</div>
    </div>
  );
}
