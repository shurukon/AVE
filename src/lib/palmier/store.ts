/**
 * Palmier Pro for Windows — central editor store (Zustand).
 * Holds project, selection, transport, chat history, MCP connection status,
 * and panel focus state. All timeline mutations flow through here so the
 * MCP server can replay them deterministically.
 */

"use client";

import { create } from "zustand";
import {
  Clip,
  ChatMessage,
  ColorGrade,
  Effect,
  EffectKind,
  Keyframe,
  MediaAsset,
  MediaFolder,
  Project,
  Track,
  defaultColorGrade,
  defaultCrop,
  defaultTextStyle,
  defaultTransform,
  formatTimecode,
  newId,
} from "./types";

export type ToolMode = "select" | "razor" | "rippleTrim" | "rippleInsert" | "range";

interface PalmierState {
  project: Project;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  toolMode: ToolMode;
  isPlaying: boolean;
  zoom: number;
  chat: ChatMessage[];
  mcpConnected: boolean;
  mcpPort: number;
  mcpUrl: string;
  toast: { id: string; title: string; description?: string } | null;
  focusedPanel: "media" | "preview" | "inspector" | "timeline" | null;
  showScopes: boolean;
  showEffects: boolean;
  showAgent: boolean;

  // Project lifecycle
  newProject: () => void;
  loadProject: (p: Project) => void;

  // Media
  addMedia: (m: MediaAsset) => void;
  removeMedia: (id: string) => void;
  renameMedia: (id: string, name: string) => void;

  // Folders
  addFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveToFolder: (mediaId: string, folderId: string | null) => void;

  // Tracks
  addTrack: (kind: Track["kind"]) => void;
  removeTrack: (id: string) => void;
  toggleTrackMute: (id: string) => void;
  toggleTrackHidden: (id: string) => void;
  toggleTrackLock: (id: string) => void;
  toggleSyncLock: (id: string) => void;

  // Clips
  addClip: (clip: Clip) => void;
  addClipFromMedia: (mediaId: string, trackId: string, start: number) => Clip | null;
  insertClipFromMedia: (mediaId: string, trackId: string, at: number) => Clip | null;
  moveClip: (id: string, start: number, trackId?: string) => void;
  trimClip: (id: string, side: "start" | "end", deltaSeconds: number) => void;
  splitClip: (id: string, atSeconds: number) => void;
  removeClip: (id: string) => void;
  setClipProperties: (id: string, patch: Partial<Clip>) => void;
  setColorGrade: (id: string, patch: Partial<ColorGrade>) => void;
  selectClip: (id: string | null, additive?: boolean) => void;
  selectClips: (ids: string[]) => void;

  // Effects
  addEffect: (clipId: string, kind: EffectKind) => void;
  removeEffect: (clipId: string, effectId: string) => void;
  toggleEffect: (clipId: string, effectId: string) => void;
  setEffectParam: (clipId: string, effectId: string, key: string, value: number | string | boolean) => void;

  // Keyframes
  addKeyframe: (clipId: string, kf: Omit<Keyframe, "id">) => void;
  removeKeyframe: (clipId: string, kfId: string) => void;

  // Range selection
  setInPoint: (t: number | null) => void;
  setOutPoint: (t: number | null) => void;

  // Playback
  setPlayhead: (seconds: number) => void;
  setPlaying: (p: boolean) => void;
  setZoom: (z: number) => void;
  setToolMode: (m: ToolMode) => void;

  // Project settings
  setProjectSettings: (patch: Partial<Project["settings"]>) => void;

  // Chat
  pushChat: (msg: ChatMessage) => void;
  updateChat: (id: string, patch: Partial<ChatMessage>) => void;
  clearChat: () => void;

  // MCP
  setMcpConnected: (v: boolean) => void;
  setMcpPort: (port: number) => void;

  // UI
  showToast: (title: string, description?: string) => void;
  clearToast: () => void;
  setFocusedPanel: (p: PalmierState["focusedPanel"]) => void;
  toggleScopes: () => void;
  toggleEffects: () => void;
  toggleAgent: () => void;
}

function makeDefaultProject(): Project {
  const videoTrack: Track = {
    id: "track_v1", kind: "video", name: "V1",
    muted: false, hidden: false, locked: false, height: 64, syncLock: true,
  };
  const audioTrack: Track = {
    id: "track_a1", kind: "audio", name: "A1",
    muted: false, hidden: false, locked: false, height: 48, syncLock: true,
  };
  const textTrack: Track = {
    id: "track_t1", kind: "text", name: "T1",
    muted: false, hidden: false, locked: false, height: 40, syncLock: false,
  };
  return {
    id: newId("proj"),
    settings: {
      name: "Untitled Project",
      fps: 30,
      width: 1920,
      height: 1080,
      backgroundColor: "#000000",
    },
    tracks: [videoTrack, audioTrack, textTrack],
    clips: [],
    media: [],
    folders: [],
    playhead: 0,
    inPoint: null,
    outPoint: null,
  };
}

function makeClipDefaults(): Pick<Clip, "transform" | "crop" | "colorGrade" | "effects" | "keyframes"> {
  return {
    transform: { ...defaultTransform },
    crop: { ...defaultCrop },
    colorGrade: { ...defaultColorGrade },
    effects: [],
    keyframes: [],
  };
}

export const usePalmier = create<PalmierState>((set, get) => ({
  project: makeDefaultProject(),
  selectedClipIds: [],
  selectedTrackId: null,
  toolMode: "select",
  isPlaying: false,
  zoom: 60,
  chat: [],
  mcpConnected: false,
  mcpPort: 19789,
  mcpUrl: "http://127.0.0.1:19789/mcp",
  toast: null,
  focusedPanel: null,
  showScopes: false,
  showEffects: false,
  showAgent: false,

  newProject: () => set({ project: makeDefaultProject(), selectedClipIds: [] }),

  loadProject: (p) => set({ project: p, selectedClipIds: [] }),

  addMedia: (m) =>
    set((s) => ({
      project: { ...s.project, media: [...s.project.media, m] },
    })),

  removeMedia: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        media: s.project.media.filter((m) => m.id !== id),
        clips: s.project.clips.filter((c) => c.mediaId !== id),
      },
    })),

  renameMedia: (id, name) =>
    set((s) => ({
      project: {
        ...s.project,
        media: s.project.media.map((m) => (m.id === id ? { ...m, name } : m)),
      },
    })),

  addFolder: (name) => {
    const id = newId("folder");
    set((s) => ({
      project: {
        ...s.project,
        folders: [...s.project.folders, { id, name }],
      },
    }));
    return id;
  },

  renameFolder: (id, name) =>
    set((s) => ({
      project: {
        ...s.project,
        folders: s.project.folders.map((f) => (f.id === id ? { ...f, name } : f)),
      },
    })),

  deleteFolder: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        folders: s.project.folders.filter((f) => f.id !== id),
        media: s.project.media.map((m) =>
          m.folderId === id ? { ...m, folderId: null } : m,
        ),
      },
    })),

  moveToFolder: (mediaId, folderId) =>
    set((s) => ({
      project: {
        ...s.project,
        media: s.project.media.map((m) =>
          m.id === mediaId ? { ...m, folderId } : m,
        ),
      },
    })),

  addTrack: (kind) =>
    set((s) => {
      const existing = s.project.tracks.filter((t) => t.kind === kind).length;
      const name = `${kind[0].toUpperCase()}${existing + 1}`;
      const t: Track = {
        id: newId("track"), kind, name,
        muted: false, hidden: false, locked: false,
        height: kind === "audio" ? 48 : kind === "text" ? 40 : 64,
        syncLock: kind !== "text",
      };
      return { project: { ...s.project, tracks: [...s.project.tracks, t] } };
    }),

  removeTrack: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.filter((t) => t.id !== id),
        clips: s.project.clips.filter((c) => c.trackId !== id),
      },
    })),

  toggleTrackMute: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === id ? { ...t, muted: !t.muted } : t,
        ),
      },
    })),

  toggleTrackHidden: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === id ? { ...t, hidden: !t.hidden } : t,
        ),
      },
    })),

  toggleTrackLock: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === id ? { ...t, locked: !t.locked } : t,
        ),
      },
    })),

  toggleSyncLock: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === id ? { ...t, syncLock: !t.syncLock } : t,
        ),
      },
    })),

  addClip: (clip) =>
    set((s) => ({
      project: { ...s.project, clips: [...s.project.clips, clip] },
    })),

  addClipFromMedia: (mediaId, trackId, start) => {
    const state = get();
    const media = state.project.media.find((m) => m.id === mediaId);
    if (!media) return null;
    const track = state.project.tracks.find((t) => t.id === trackId);
    if (!track) return null;
    const type =
      media.type === "video" ? "video"
      : media.type === "audio" ? "audio"
      : media.type === "image" ? "image"
      : "video";
    const clip: Clip = {
      id: newId("clip"),
      trackId,
      mediaId,
      type,
      start,
      duration: media.duration || 5,
      sourceStart: 0,
      sourceEnd: media.duration || 5,
      speed: 1,
      volume: 1,
      ...makeClipDefaults(),
      fadeIn: 0,
      fadeOut: 0,
    };
    set((s) => ({
      project: { ...s.project, clips: [...s.project.clips, clip] },
    }));
    return clip;
  },

  insertClipFromMedia: (mediaId, trackId, at) => {
    // Ripple insert: split any clip at `at` on the track, then push everything right by the new clip duration
    const state = get();
    const media = state.project.media.find((m) => m.id === mediaId);
    if (!media) return null;
    const track = state.project.tracks.find((t) => t.id === trackId);
    if (!track) return null;
    const duration = media.duration || 5;
    const type =
      media.type === "video" ? "video"
      : media.type === "audio" ? "audio"
      : media.type === "image" ? "image"
      : "video";
    const newClip: Clip = {
      id: newId("clip"),
      trackId,
      mediaId,
      type,
      start: at,
      duration,
      sourceStart: 0,
      sourceEnd: duration,
      speed: 1,
      volume: 1,
      ...makeClipDefaults(),
      fadeIn: 0,
      fadeOut: 0,
    };
    set((s) => ({
      project: {
        ...s.project,
        clips: [
          ...s.project.clips.map((c) => {
            if (c.trackId !== trackId) return c;
            if (c.start >= at) {
              return { ...c, start: c.start + duration };
            }
            if (c.start + c.duration > at) {
              // Split this clip
              const newDur = at - c.start;
              return { ...c, duration: newDur };
            }
            return c;
          }),
          newClip,
        ],
      },
    }));
    return newClip;
  },

  moveClip: (id, start, trackId) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === id
            ? { ...c, start: Math.max(0, start), trackId: trackId ?? c.trackId }
            : c,
        ),
      },
    })),

  trimClip: (id, side, deltaSeconds) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) => {
          if (c.id !== id) return c;
          if (side === "start") {
            const newStart = Math.max(0, c.start + deltaSeconds);
            const newDuration = Math.max(0.1, c.duration - deltaSeconds);
            return {
              ...c,
              start: newStart,
              duration: newDuration,
              sourceStart: Math.max(0, c.sourceStart + deltaSeconds),
            };
          } else {
            return { ...c, duration: Math.max(0.1, c.duration + deltaSeconds) };
          }
        }),
      },
    })),

  splitClip: (id, atSeconds) =>
    set((s) => {
      const clips = [...s.project.clips];
      const idx = clips.findIndex((c) => c.id === id);
      if (idx < 0) return s;
      const c = clips[idx];
      if (atSeconds <= c.start || atSeconds >= c.start + c.duration) return s;
      const firstDuration = atSeconds - c.start;
      const secondDuration = c.duration - firstDuration;
      const first: Clip = { ...c, duration: firstDuration };
      const second: Clip = {
        ...c,
        id: newId("clip"),
        start: atSeconds,
        duration: secondDuration,
        sourceStart: c.sourceStart + firstDuration,
        keyframes: c.keyframes.filter((k) => k.time >= atSeconds).map((k) => ({ ...k })),
      };
      first.keyframes = c.keyframes.filter((k) => k.time < atSeconds).map((k) => ({ ...k }));
      clips.splice(idx, 1, first, second);
      return { project: { ...s.project, clips } };
    }),

  removeClip: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.filter((c) => c.id !== id),
      },
      selectedClipIds: s.selectedClipIds.filter((x) => x !== id),
    })),

  setClipProperties: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      },
    })),

  setColorGrade: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === id ? { ...c, colorGrade: { ...c.colorGrade, ...patch } } : c,
        ),
      },
    })),

  selectClip: (id, additive) =>
    set((s) => {
      if (id === null) return { selectedClipIds: [] };
      if (additive) {
        return {
          selectedClipIds: s.selectedClipIds.includes(id)
            ? s.selectedClipIds.filter((x) => x !== id)
            : [...s.selectedClipIds, id],
        };
      }
      return { selectedClipIds: [id] };
    }),

  selectClips: (ids) => set({ selectedClipIds: ids }),

  addEffect: (clipId, kind) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) => {
          if (c.id !== clipId) return c;
          const effect: Effect = {
            id: newId("fx"),
            kind,
            enabled: true,
            params: defaultEffectParams(kind),
          };
          return { ...c, effects: [...c.effects, effect] };
        }),
      },
    })),

  removeEffect: (clipId, effectId) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === clipId
            ? { ...c, effects: c.effects.filter((e) => e.id !== effectId) }
            : c,
        ),
      },
    })),

  toggleEffect: (clipId, effectId) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                effects: c.effects.map((e) =>
                  e.id === effectId ? { ...e, enabled: !e.enabled } : e,
                ),
              }
            : c,
        ),
      },
    })),

  setEffectParam: (clipId, effectId, key, value) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                effects: c.effects.map((e) =>
                  e.id === effectId
                    ? { ...e, params: { ...e.params, [key]: value } }
                    : e,
                ),
              }
            : c,
        ),
      },
    })),

  addKeyframe: (clipId, kf) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                keyframes: [
                  ...c.keyframes.filter((k) => !(k.property === kf.property && k.time === kf.time)),
                  { ...kf, id: newId("kf") },
                ].sort((a, b) => a.time - b.time),
              }
            : c,
        ),
      },
    })),

  removeKeyframe: (clipId, kfId) =>
    set((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) =>
          c.id === clipId
            ? { ...c, keyframes: c.keyframes.filter((k) => k.id !== kfId) }
            : c,
        ),
      },
    })),

  setInPoint: (t) => set((s) => ({ project: { ...s.project, inPoint: t } })),
  setOutPoint: (t) => set((s) => ({ project: { ...s.project, outPoint: t } })),

  setPlayhead: (seconds) =>
    set((s) => ({
      project: { ...s.project, playhead: Math.max(0, seconds) },
    })),

  setPlaying: (p) => set({ isPlaying: p }),
  setZoom: (z) => set({ zoom: Math.min(400, Math.max(10, z)) }),
  setToolMode: (m) => set({ toolMode: m }),

  setProjectSettings: (patch) =>
    set((s) => ({
      project: {
        ...s.project,
        settings: { ...s.project.settings, ...patch },
      },
    })),

  pushChat: (msg) => set((s) => ({ chat: [...s.chat, msg] })),
  updateChat: (id, patch) =>
    set((s) => ({
      chat: s.chat.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  clearChat: () => set({ chat: [] }),

  setMcpConnected: (v) => set({ mcpConnected: v }),
  setMcpPort: (port) =>
    set({ mcpPort: port, mcpUrl: `http://127.0.0.1:${port}/mcp` }),

  showToast: (title, description) =>
    set({ toast: { id: newId("toast"), title, description } }),
  clearToast: () => set({ toast: null }),

  setFocusedPanel: (p) => set({ focusedPanel: p }),
  toggleScopes: () => set((s) => ({ showScopes: !s.showScopes })),
  toggleEffects: () => set((s) => ({ showEffects: !s.showEffects })),
  toggleAgent: () => set((s) => ({ showAgent: !s.showAgent })),
}));

function defaultEffectParams(kind: EffectKind): Record<string, number | string | boolean> {
  switch (kind) {
    case "color.exposure":      return { value: 0 };
    case "color.contrast":      return { value: 0 };
    case "color.saturation":    return { value: 0 };
    case "color.temperature":   return { value: 0 };
    case "color.highlightsShadows": return { highlights: 0, shadows: 0 };
    case "color.blacksWhites":  return { blacks: 0, whites: 0 };
    case "color.vibrance":      return { value: 0 };
    case "color.wheels":        return { liftHue: 0, liftSat: 0, liftLuma: 0, gammaHue: 0, gammaSat: 0, gammaLuma: 0, gainHue: 0, gainSat: 0, gainLuma: 0 };
    case "color.curves":        return { master: 0, red: 0, green: 0, blue: 0 };
    case "color.hueCurves":     return { hue: 0, sat: 0, lum: 0 };
    case "color.lut":           return { name: "", intensity: 1 };
    case "detail.clarity":      return { clarity: 0, dehaze: 0 };
    case "blur.gaussian":       return { radius: 0 };
    case "blur.sharpen":        return { amount: 0 };
    case "blur.noiseReduction": return { amount: 0 };
    case "blur.motion":         return { radius: 0, angle: 0 };
    case "stylize.grain":       return { amount: 0, size: 1 };
    case "stylize.vignette":    return { amount: 0, size: 0.5, feather: 0.5 };
    case "stylize.glow":        return { radius: 0, intensity: 0, threshold: 0.5 };
    case "key.chroma":          return { hue: 120, tolerance: 0.2, spill: 0 };
    default:                    return {};
  }
}

export {
  formatTimecode, newId,
  defaultTextStyle, defaultTransform,
  defaultColorGrade, defaultCrop,
};
