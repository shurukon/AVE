/**
 * Palmier Pro for Windows — domain types.
 * Mirrors the macOS Swift models so the MCP server can speak the same
 * vocabulary and so our store shape matches the original.
 */

export type MediaType = "video" | "audio" | "image" | "text" | "caption" | "lottie";

export type ClipType = "video" | "audio" | "image" | "text" | "caption" | "lottie";

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  fps?: number;
  size?: number;
  folderId?: string | null;
  /** Generation status for AI-produced assets */
  generationStatus?: "generating" | "downloading" | "failed" | "none";
}

export interface MediaFolder {
  id: string;
  name: string;
  color?: string;
  parentId?: string | null;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  italic?: boolean;
  underline?: boolean;
  background?: string;
  /** 0 = top, 1 = bottom */
  positionY?: number;
  /** letter case transform */
  case?: "none" | "upper" | "lower" | "title";
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

/** Crop — normalized 0..1 each side */
export interface Crop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Color grade — 3-wheel (Lift/Gamma/Gain) + master */
export interface ColorGrade {
  liftHue: number;       // 0..360
  liftSat: number;       // 0..1
  liftLuma: number;      // -1..1
  gammaHue: number;
  gammaSat: number;
  gammaLuma: number;
  gainHue: number;
  gainSat: number;
  gainLuma: number;
  /** Master adjustments */
  exposure: number;      // -1..1
  contrast: number;      // -1..1
  saturation: number;    // -1..1
  temperature: number;   // -1..1 (cool..warm)
  tint: number;          // -1..1 (green..magenta)
  highlights: number;    // -1..1
  shadows: number;       // -1..1
  blacks: number;        // -1..1
  whites: number;        // -1..1
  vibrance: number;      // -1..1
  clarity: number;       // -1..1
  dehaze: number;        // -1..1
}

export const defaultColorGrade: ColorGrade = {
  liftHue: 0, liftSat: 0, liftLuma: 0,
  gammaHue: 0, gammaSat: 0, gammaLuma: 0,
  gainHue: 0, gainSat: 0, gainLuma: 0,
  exposure: 0, contrast: 0, saturation: 0,
  temperature: 0, tint: 0,
  highlights: 0, shadows: 0, blacks: 0, whites: 0,
  vibrance: 0, clarity: 0, dehaze: 0,
};

/** Effect — one of the 20 supported effects (mirrors Effect.swift catalog) */
export type EffectKind =
  | "color.exposure"
  | "color.contrast"
  | "color.saturation"
  | "color.temperature"
  | "color.highlightsShadows"
  | "color.blacksWhites"
  | "color.vibrance"
  | "color.wheels"
  | "color.curves"
  | "color.hueCurves"
  | "color.lut"
  | "detail.clarity"
  | "blur.gaussian"
  | "blur.sharpen"
  | "blur.noiseReduction"
  | "blur.motion"
  | "stylize.grain"
  | "stylize.vignette"
  | "stylize.glow"
  | "key.chroma";

export interface Effect {
  id: string;
  kind: EffectKind;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export interface Keyframe {
  id: string;
  /** Property path on the clip, e.g. "transform.opacity" or "colorGrade.exposure" */
  property: string;
  /** Timeline position, seconds */
  time: number;
  value: number;
  /** Easing */
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface Clip {
  id: string;
  trackId: string;
  mediaId?: string;
  type: ClipType;
  start: number;
  duration: number;
  sourceStart: number;
  sourceEnd: number;
  speed: number;
  volume: number;
  text?: string;
  textStyle?: TextStyle;
  transform: Transform;
  crop: Crop;
  colorGrade: ColorGrade;
  fadeIn: number;
  fadeOut: number;
  color?: string;
  /** Linked clips (e.g. video + audio from same source) */
  linkedClipIds?: string[];
  /** Effects applied to this clip */
  effects: Effect[];
  /** Keyframes */
  keyframes: Keyframe[];
  /** Locked from editing */
  locked?: boolean;
}

export type TrackKind = "video" | "audio" | "text";

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
  height: number;
  /** Sync-lock: when other clips ripple, this track follows */
  syncLock: boolean;
}

export interface ProjectSettings {
  name: string;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
}

export interface Project {
  id: string;
  settings: ProjectSettings;
  tracks: Track[];
  clips: Clip[];
  media: MediaAsset[];
  folders: MediaFolder[];
  playhead: number;
  /** In/out points for range selection, seconds */
  inPoint?: number | null;
  outPoint?: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  ts: number;
  pending?: boolean;
}

export const defaultTransform: Transform = {
  x: 0, y: 0, scale: 1, rotation: 0, opacity: 1,
};

export const defaultCrop: Crop = {
  top: 0, bottom: 0, left: 0, right: 0,
};

export const defaultTextStyle: TextStyle = {
  fontFamily: "Geist, sans-serif",
  fontSize: 48,
  fontWeight: 700,
  color: "#ffffff",
  align: "center",
  positionY: 0.9,
  case: "none",
};

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export function formatTimecode(seconds: number, fps = 30): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const totalFrames = Math.round(seconds * fps);
  const f = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number, l = 2) => n.toString().padStart(l, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  return `${pad(m)}:${pad(s)}:${pad(f)}`;
}

/** Hex → RGB (0..1) — used by color grading */
export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return [r || 0, g || 0, b || 0];
}

/** HSL → RGB */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

/** Track-type color (AppTheme.TrackColor) */
export function trackColor(kind: TrackKind): string {
  switch (kind) {
    case "video": return "#0091C2";
    case "audio": return "#58A822";
    case "text":  return "#B72DD2";
    default:      return "#888888";
  }
}

/** Clip-type color */
export function clipTypeColor(type: ClipType): string {
  switch (type) {
    case "video":  return "#0091C2";
    case "audio":  return "#58A822";
    case "image":  return "#B72DD2";
    case "text":
    case "caption": return "#B72DD2";
    case "lottie": return "#E0A800";
    default:       return "#666666";
  }
}
