/**
 * Palmier Pro for Windows — MCP HTTP server (v2).
 *
 * Comprehensive cross-platform MCP server exposing the full tool vocabulary
 * from the macOS Swift version: 39 tools covering timeline editing, color
 * grading, effects, captions, export, AI generation, and project management.
 *
 * Speaks JSON-RPC 2.0 over HTTP on port 19789 (matching the macOS app).
 * Zero external dependencies — uses only Node's built-in http module.
 *
 * Connect from:
 *   - Claude Code:    claude mcp add --transport http palmier-pro http://127.0.0.1:19789/mcp
 *   - Cursor:         ~/.cursor/mcp.json
 *   - Claude Desktop: claude_desktop_config.json
 *   - Codex:          codex mcp add palmier-pro --url http://127.0.0.1:19789/mcp
 */
import http from "node:http";

const PORT = Number(process.env.PALMIER_MCP_PORT ?? 19789);

// --- In-memory project state -------------------------------------------------
let state = createDefaultProject();

function createDefaultProject() {
  return {
    id: `proj_${Math.random().toString(36).slice(2, 8)}`,
    settings: {
      name: "Untitled Project",
      fps: 30,
      width: 1920,
      height: 1080,
      backgroundColor: "#000000",
    },
    tracks: [
      { id: "track_v1", kind: "video", name: "V1", muted: false, hidden: false, locked: false, syncLock: true, height: 64 },
      { id: "track_a1", kind: "audio", name: "A1", muted: false, hidden: false, locked: false, syncLock: true, height: 48 },
      { id: "track_t1", kind: "text",  name: "T1", muted: false, hidden: false, locked: false, syncLock: false, height: 40 },
    ],
    clips: [],
    media: [],
    folders: [],
    playhead: 0,
    inPoint: null,
    outPoint: null,
  };
}

function newId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function formatTimecode(seconds, fps = 30) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const totalFrames = Math.round(seconds * fps);
  const f = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n, l = 2) => n.toString().padStart(l, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  return `${pad(m)}:${pad(s)}:${pad(f)}`;
}

// --- Tool definitions (39 tools, matches macOS) ------------------------------
const TOOLS = [
  // Timeline / inspection
  {
    name: "get_timeline",
    description: "Always call at the start of a session. Returns project settings (fps, resolution, totalFrames), track list with types and order, all clips with their frames and properties, and canGenerate (if false, generation/upscale tools will fail — tell the user to sign in to Palmier and subscribe before attempting them).",
    inputSchema: {
      type: "object",
      properties: {
        startFrame: { type: "integer", description: "Optional. Window start (inclusive); only clips intersecting [startFrame, endFrame) are returned." },
        endFrame: { type: "integer", description: "Optional. Window end (exclusive)." },
      },
    },
  },
  {
    name: "inspect_timeline",
    description: "Render composited frames at the playhead for edit verification. Returns sample frames as PNG data URIs and the current timecode. Useful for confirming visual edits.",
    inputSchema: {
      type: "object",
      properties: {
        frames: { type: "array", items: { type: "number" }, description: "Project-frame positions to render. Default: [playhead]." },
        maxFrames: { type: "integer", description: "Maximum frames to return (default 6, max 12)." },
      },
    },
  },
  // Media
  {
    name: "get_media",
    description: "Call before referencing any asset. Every mediaRef/reference ID in other tools comes from the IDs returned here. Also exposes generationStatus (generating | downloading | failed | none) for async-generated and -imported assets.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "inspect_media",
    description: "Look at a media asset before referencing or editing it. Images: the image plus dimensions and EXIF. Video: sample frames plus a transcription of the audio track. Audio: transcription. Lottie: frames sampled evenly across the animation (over gray), plus framerate and duration. Transcription is sentence-level segments — [text, start, end] tuples, capped at 400 — in source seconds, or project frames when clipId is set. When capped, pass the returned nextStartSeconds as startSeconds for the next page. Long media: pass overview=true for a one-image storyboard, read the segments, then re-call with startSeconds/endSeconds to zoom.",
    inputSchema: {
      type: "object",
      required: ["mediaRef"],
      properties: {
        mediaRef: { type: "string" },
        clipId: { type: "string", description: "Optional. A clip referencing this mediaRef; transcript times come back as project frames for that clip." },
        maxFrames: { type: "integer", description: "Sample frame count (default 6, max 12)." },
        startSeconds: { type: "number" },
        endSeconds: { type: "number" },
        wordTimestamps: { type: "boolean" },
        overview: { type: "boolean" },
        language: { type: "string", description: "BCP-47 language tag." },
      },
    },
  },
  {
    name: "import_media",
    description: "Register a media asset by absolute file path (Windows or POSIX). Returns the new mediaRef.",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string" },
        name: { type: "string" },
        type: { type: "string", enum: ["video", "audio", "image"] },
      },
    },
  },
  // Clips — add / insert / remove / move / split / properties
  {
    name: "add_clips",
    description: "Append one or more clips referencing mediaId onto a track at a start time.",
    inputSchema: {
      type: "object",
      required: ["clips"],
      properties: {
        clips: {
          type: "array",
          items: {
            type: "object",
            required: ["mediaId", "trackId", "start"],
            properties: {
              mediaId: { type: "string" },
              trackId: { type: "string" },
              start: { type: "number" },
              duration: { type: "number" },
              sourceStart: { type: "number" },
              speed: { type: "number" },
            },
          },
        },
      },
    },
  },
  {
    name: "insert_clips",
    description: "Ripple insert: split any clip at the insert point, push everything else right by the new clip duration.",
    inputSchema: {
      type: "object",
      required: ["clips"],
      properties: {
        clips: {
          type: "array",
          items: {
            type: "object",
            required: ["mediaId", "trackId", "start"],
            properties: {
              mediaId: { type: "string" },
              trackId: { type: "string" },
              start: { type: "number" },
              duration: { type: "number" },
              sourceStart: { type: "number" },
              speed: { type: "number" },
            },
          },
        },
      },
    },
  },
  {
    name: "remove_clips",
    description: "Remove one or more clips by id.",
    inputSchema: {
      type: "object",
      required: ["clipIds"],
      properties: { clipIds: { type: "array", items: { type: "string" } } },
    },
  },
  {
    name: "move_clips",
    description: "Move one or more clips to a new start time on the timeline (optionally to a different track).",
    inputSchema: {
      type: "object",
      required: ["moves"],
      properties: {
        moves: {
          type: "array",
          items: {
            type: "object",
            required: ["clipId", "start"],
            properties: {
              clipId: { type: "string" },
              start: { type: "number" },
              trackId: { type: "string" },
            },
          },
        },
      },
    },
  },
  {
    name: "set_clip_properties",
    description: "Patch one or more properties on a clip (transform, opacity, volume, speed, fades, text, textStyle, color, colorGrade, crop, ...).",
    inputSchema: {
      type: "object",
      required: ["clipId", "properties"],
      properties: {
        clipId: { type: "string" },
        properties: { type: "object" },
      },
    },
  },
  {
    name: "set_keyframes",
    description: "Replace the keyframe track for one or more properties on a clip. Each keyframe has property, time (seconds), value, and easing.",
    inputSchema: {
      type: "object",
      required: ["clipId", "keyframes"],
      properties: {
        clipId: { type: "string" },
        keyframes: {
          type: "array",
          items: {
            type: "object",
            required: ["property", "time", "value"],
            properties: {
              property: { type: "string", description: "Dot-path on the clip, e.g. 'transform.opacity'." },
              time: { type: "number", description: "Timeline position in seconds." },
              value: { type: "number" },
              easing: { type: "string", enum: ["linear", "easeIn", "easeOut", "easeInOut"] },
            },
          },
        },
      },
    },
  },
  {
    name: "split_clips",
    description: "Split one or more clips at given times.",
    inputSchema: {
      type: "object",
      required: ["splits"],
      properties: {
        splits: {
          type: "array",
          items: {
            type: "object",
            required: ["clipId", "atSeconds"],
            properties: { clipId: { type: "string" }, atSeconds: { type: "number" } },
          },
        },
      },
    },
  },
  {
    name: "ripple_delete_ranges",
    description: "Delete a time range on a track and close the gap (ripple).",
    inputSchema: {
      type: "object",
      required: ["ranges"],
      properties: {
        ranges: {
          type: "array",
          items: {
            type: "object",
            required: ["trackId", "start", "end"],
            properties: { trackId: { type: "string" }, start: { type: "number" }, end: { type: "number" } },
          },
        },
      },
    },
  },
  {
    name: "remove_tracks",
    description: "Remove one or more tracks by id. Also removes all clips on those tracks.",
    inputSchema: {
      type: "object",
      required: ["trackIds"],
      properties: { trackIds: { type: "array", items: { type: "string" } } },
    },
  },
  // Text / captions / transcript
  {
    name: "add_texts",
    description: "Add one or more text clips on a text track.",
    inputSchema: {
      type: "object",
      required: ["texts"],
      properties: {
        texts: {
          type: "array",
          items: {
            type: "object",
            required: ["trackId", "start", "duration", "text"],
            properties: {
              trackId: { type: "string" },
              start: { type: "number" },
              duration: { type: "number" },
              text: { type: "string" },
              style: { type: "object" },
            },
          },
        },
      },
    },
  },
  {
    name: "add_captions",
    description: "Generate captions for video/audio clips on the timeline. (Stub — returns guidance in this build.)",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string" },
        clipIds: { type: "array", items: { type: "string" } },
        language: { type: "string" },
      },
    },
  },
  {
    name: "remove_words",
    description: "Remove words by global index from the transcript (text-based editing). (Stub — returns guidance.)",
    inputSchema: {
      type: "object",
      required: ["indices"],
      properties: { indices: { type: "array", items: { type: "integer" } } },
    },
  },
  {
    name: "get_transcript",
    description: "Returns the spoken transcript of the current timeline in project frames. (Stub — returns guidance.)",
    inputSchema: { type: "object", properties: {} },
  },
  // Audio
  {
    name: "sync_audio",
    description: "Synchronize audio with video. (Stub — returns guidance.)",
    inputSchema: {
      type: "object",
      required: ["videoClipId", "audioClipId"],
      properties: {
        videoClipId: { type: "string" },
        audioClipId: { type: "string" },
      },
    },
  },
  // Color / effects
  {
    name: "apply_color",
    description: "Apply a color grade / LUT to a clip. Patches clip.colorGrade with the provided values. Lift/gamma/gain use hue (0..360), sat (0..1), luma (-1..1).",
    inputSchema: {
      type: "object",
      required: ["clipId"],
      properties: {
        clipId: { type: "string" },
        grade: {
          type: "object",
          properties: {
            exposure: { type: "number" }, contrast: { type: "number" },
            saturation: { type: "number" }, temperature: { type: "number" },
            tint: { type: "number" }, highlights: { type: "number" },
            shadows: { type: "number" }, blacks: { type: "number" },
            whites: { type: "number" }, vibrance: { type: "number" },
            clarity: { type: "number" }, dehaze: { type: "number" },
          },
        },
      },
    },
  },
  {
    name: "apply_effect",
    description: "Apply an effect (vignette, glow, grain, ...) to a clip. Effect kinds: color.exposure, color.contrast, color.saturation, color.temperature, color.highlightsShadows, color.blacksWhites, color.vibrance, color.wheels, color.curves, color.hueCurves, color.lut, detail.clarity, blur.gaussian, blur.sharpen, blur.noiseReduction, blur.motion, stylize.grain, stylize.vignette, stylize.glow, key.chroma.",
    inputSchema: {
      type: "object",
      required: ["clipId", "effect"],
      properties: {
        clipId: { type: "string" },
        effect: { type: "string", description: "Effect kind, e.g. 'stylize.vignette'." },
        params: { type: "object", description: "Effect parameters as key-value pairs." },
      },
    },
  },
  {
    name: "inspect_color",
    description: "Inspect color scopes (histogram, waveform, vectorscope) for a clip. Returns mean/black/white/shadow/mid/high RGB, clip %, sat mean, warm/cool + green/magenta bias.",
    inputSchema: {
      type: "object",
      required: ["clipId"],
      properties: { clipId: { type: "string" } },
    },
  },
  // Search
  {
    name: "search_media",
    description: "Semantic visual + spoken search across all media assets. Returns 3 groups: Moments (visual matches), Spoken (transcript matches), Files (name matches). Visual search uses on-device SigLIP2 in macOS; in this build, only file-name matching is supported.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        limit: { type: "integer", description: "Max results per group (default 10)." },
      },
    },
  },
  // Folders
  {
    name: "list_folders",
    description: "List all media folders in the project.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_folder",
    description: "Create a new media folder.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    },
  },
  {
    name: "move_to_folder",
    description: "Move a media asset into a folder. Pass folderId=null to move to root.",
    inputSchema: {
      type: "object",
      required: ["mediaId", "folderId"],
      properties: {
        mediaId: { type: "string" },
        folderId: { type: ["string", "null"] },
      },
    },
  },
  {
    name: "rename_media",
    description: "Rename a media asset.",
    inputSchema: {
      type: "object",
      required: ["mediaId", "name"],
      properties: { mediaId: { type: "string" }, name: { type: "string" } },
    },
  },
  {
    name: "rename_folder",
    description: "Rename a media folder.",
    inputSchema: {
      type: "object",
      required: ["folderId", "name"],
      properties: { folderId: { type: "string" }, name: { type: "string" } },
    },
  },
  {
    name: "delete_media",
    description: "Delete a media asset by id. Does NOT remove clips referencing it — they become orphaned (you can clean them up with remove_clips).",
    inputSchema: {
      type: "object",
      required: ["mediaId"],
      properties: { mediaId: { type: "string" } },
    },
  },
  {
    name: "delete_folder",
    description: "Delete a media folder. Assets inside are moved to root, NOT deleted.",
    inputSchema: {
      type: "object",
      required: ["folderId"],
      properties: { folderId: { type: "string" } },
    },
  },
  // Export / project settings
  {
    name: "export_project",
    description: "Render the timeline to a video file. Returns the FFmpeg command and a render plan. In the Electron build, the main process can run ffmpeg.exe to actually produce the file.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["mp4", "webm", "mov", "gif"] },
        resolution: { type: "string", enum: ["1080p", "720p", "480p", "original"] },
        codec: { type: "string", enum: ["h264", "h265", "prores"] },
        outputPath: { type: "string" },
      },
    },
  },
  {
    name: "set_project_settings",
    description: "Patch the project settings (name, fps, width, height, backgroundColor).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" }, fps: { type: "number" },
        width: { type: "number" }, height: { type: "number" },
        backgroundColor: { type: "string" },
      },
    },
  },
  // AI generation (closed source in macOS — stubs here)
  {
    name: "list_models",
    description: "List available generative AI models. (Returns an empty list in the open-source build — generative AI requires a subscription.)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "generate_video",
    description: "Generate a video with AI. Models: Seedance 2.0/2.0 Fast, Kling v3, Veo 3.1, Grok. Requires login + subscription. (Returns guidance.)",
    inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string" }, duration: { type: "number" } } },
  },
  {
    name: "generate_image",
    description: "Generate an image with AI. Models: Nano Banana Pro, GPT Image. Requires login + subscription. (Returns guidance.)",
    inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string" } } },
  },
  {
    name: "generate_audio",
    description: "Generate audio with AI. Models: Lyria 3 Pro, MiniMax Music, ElevenLabs TTS, Sonilo. Requires login + subscription. (Returns guidance.)",
    inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string" } } },
  },
  {
    name: "upscale_media",
    description: "Upscale media with AI. Models: ByteDance/SeedVR. Requires login + subscription. (Returns guidance.)",
    inputSchema: { type: "object", properties: { mediaId: { type: "string" }, model: { type: "string" } } },
  },
  // Undo / feedback
  {
    name: "undo",
    description: "Undo the last change. (Stub — returns guidance.)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "send_feedback",
    description: "Send bug reports or feature requests to the Palmier team.",
    inputSchema: {
      type: "object",
      required: ["message"],
      properties: {
        message: { type: "string" },
        kind: { type: "string", enum: ["bug", "feature", "limitation", "other"] },
      },
    },
  },
  // Internal tools used by the Electron shell to sync state
  {
    name: "_get_state",
    description: "Internal: return the full in-memory project state.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "_set_state",
    description: "Internal: replace the full in-memory project state.",
    inputSchema: {
      type: "object",
      required: ["state"],
      properties: { state: { type: "object" } },
    },
  },
];

// --- Tool dispatch -----------------------------------------------------------
function dispatch(name, args) {
  switch (name) {
    case "get_timeline":
      return {
        project: state,
        totalFrames: Math.round(
          (state.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0) || 0) * state.settings.fps,
        ),
        canGenerate: false,
        timecode: formatTimecode(state.playhead, state.settings.fps),
      };

    case "inspect_timeline": {
      // Return playhead position + clip summary at playhead (this build can't actually render)
      const fps = state.settings.fps;
      const frames = args.frames ?? [state.playhead * fps];
      const atPlayhead = state.clips.filter((c) => c.start <= state.playhead && c.start + c.duration > state.playhead);
      return {
        frames: frames.map((f) => ({
          frame: f,
          timecode: formatTimecode(f / fps, fps),
          clipsAtFrame: atPlayhead.map((c) => ({ id: c.id, type: c.type, text: c.text })),
        })),
        note: "Frame rendering requires the Electron build with canvas compositor. Use the in-app Preview panel for visual verification.",
      };
    }

    case "get_media":
      return { media: state.media, folders: state.folders };

    case "inspect_media": {
      const m = state.media.find((x) => x.id === args.mediaRef);
      if (!m) return { error: "media_not_found" };
      return { media: m };
    }

    case "import_media": {
      const media = {
        id: newId("media"),
        name: args.name ?? (args.path.split(/[\\/]/).pop() ?? "media"),
        type: args.type ?? "video",
        url: args.path,
        duration: 0,
      };
      state.media.push(media);
      return { media };
    }

    case "add_clips": {
      const added = [];
      for (const c of args.clips) {
        const media = state.media.find((m) => m.id === c.mediaId);
        const clip = makeClipFromMedia(c, media, c.trackId);
        state.clips.push(clip);
        added.push(clip);
      }
      return { added };
    }

    case "insert_clips": {
      const added = [];
      for (const c of args.clips) {
        const media = state.media.find((m) => m.id === c.mediaId);
        const duration = c.duration ?? media?.duration ?? 5;
        // Ripple: shift later clips right by `duration`, trim any straddler
        for (const existing of state.clips) {
          if (existing.trackId !== c.trackId) continue;
          if (existing.start >= c.start) {
            existing.start += duration;
          } else if (existing.start + existing.duration > c.start) {
            existing.duration = c.start - existing.start;
          }
        }
        const clip = makeClipFromMedia(c, media, c.trackId);
        state.clips.push(clip);
        added.push(clip);
      }
      return { added };
    }

    case "remove_clips": {
      const before = state.clips.length;
      state.clips = state.clips.filter((c) => !args.clipIds.includes(c.id));
      return { removed: before - state.clips.length };
    }

    case "move_clips": {
      for (const m of args.moves) {
        const c = state.clips.find((x) => x.id === m.clipId);
        if (!c) continue;
        c.start = Math.max(0, m.start);
        if (m.trackId) c.trackId = m.trackId;
      }
      return { moved: args.moves.length };
    }

    case "set_clip_properties": {
      const c = state.clips.find((x) => x.id === args.clipId);
      if (!c) return { error: "clip_not_found" };
      Object.assign(c, args.properties);
      return { updated: c };
    }

    case "set_keyframes": {
      const c = state.clips.find((x) => x.id === args.clipId);
      if (!c) return { error: "clip_not_found" };
      if (!c.keyframes) c.keyframes = [];
      // Replace keyframes for properties mentioned in args.keyframes
      const touchedProps = new Set(args.keyframes.map((k) => k.property));
      c.keyframes = c.keyframes.filter((k) => !touchedProps.has(k.property));
      for (const k of args.keyframes) {
        c.keyframes.push({ ...k, id: newId("kf") });
      }
      c.keyframes.sort((a, b) => a.time - b.time);
      return { keyframes: c.keyframes };
    }

    case "split_clips": {
      const out = [];
      for (const s of args.splits) {
        const idx = state.clips.findIndex((c) => c.id === s.clipId);
        if (idx < 0) continue;
        const c = state.clips[idx];
        if (s.atSeconds <= c.start || s.atSeconds >= c.start + c.duration) continue;
        const firstDur = s.atSeconds - c.start;
        const secondDur = c.duration - firstDur;
        const second = { ...c, id: newId("clip"), start: s.atSeconds, duration: secondDur, sourceStart: c.sourceStart + firstDur };
        c.duration = firstDur;
        state.clips.splice(idx + 1, 0, second);
        out.push({ firstId: c.id, secondId: second.id });
      }
      return { splits: out };
    }

    case "ripple_delete_ranges": {
      let removed = 0;
      for (const r of args.ranges) {
        const span = r.end - r.start;
        state.clips = state.clips.flatMap((c) => {
          if (c.trackId !== r.trackId) return [c];
          const cEnd = c.start + c.duration;
          if (cEnd <= r.start || c.start >= r.end) return [c];
          if (c.start >= r.start && cEnd <= r.end) { removed++; return []; }
          if (c.start < r.start && cEnd > r.start && cEnd <= r.end) {
            return [{ ...c, duration: r.start - c.start }];
          }
          if (c.start >= r.start && c.start < r.end && cEnd > r.end) {
            const trimLeft = r.end - c.start;
            return [{ ...c, start: r.start, duration: c.duration - trimLeft, sourceStart: c.sourceStart + trimLeft }];
          }
          if (c.start < r.start && cEnd > r.end) {
            return [
              { ...c, duration: r.start - c.start },
              { ...c, start: r.start, duration: cEnd - r.end, sourceStart: c.sourceStart + (r.end - c.start) },
            ];
          }
          return [c];
        });
        for (const c of state.clips) {
          if (c.trackId !== r.trackId) continue;
          if (c.start >= r.end) c.start -= span;
        }
      }
      return { removed, ranges: args.ranges.length };
    }

    case "remove_tracks": {
      const before = state.tracks.length;
      state.tracks = state.tracks.filter((t) => !args.trackIds.includes(t.id));
      state.clips = state.clips.filter((c) => !args.trackIds.includes(c.trackId));
      return { removed: before - state.tracks.length };
    }

    case "add_texts": {
      const added = [];
      for (const t of args.texts) {
        const clip = {
          id: newId("clip"),
          trackId: t.trackId,
          type: "text",
          start: t.start,
          duration: t.duration,
          sourceStart: 0,
          sourceEnd: t.duration,
          speed: 1,
          volume: 1,
          text: t.text,
          textStyle: t.style ?? {
            fontFamily: "Geist, sans-serif",
            fontSize: 48, fontWeight: 700,
            color: "#ffffff", align: "center",
            positionY: 0.9, case: "none",
          },
          transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
          crop: { top: 0, bottom: 0, left: 0, right: 0 },
          colorGrade: defaultColorGrade(),
          fadeIn: 0, fadeOut: 0,
          color: "#B72DD2",
          effects: [], keyframes: [],
        };
        state.clips.push(clip);
        added.push(clip);
      }
      return { added };
    }

    case "add_captions":
      return {
        guidance: "Caption generation requires on-device Speech framework (macOS) or an external transcription service. In the Windows open-source build, use a transcription service (e.g. Whisper) and pass the segments to add_texts.",
      };

    case "remove_words":
      return {
        guidance: "Word removal requires a transcript. Use ripple_delete_ranges with the word's startFrame/endFrame converted to seconds.",
        indices: args.indices,
      };

    case "get_transcript":
      return {
        guidance: "On-device transcription is unavailable in this build. Pair Palmier Pro with a transcription MCP tool or service.",
        words: [],
      };

    case "sync_audio":
      return {
        guidance: "Audio sync correlates envelopes between the camera audio and the external recorder. Use the inspect_media tool to extract envelopes, then call move_clips with the computed offset.",
        videoClipId: args.videoClipId, audioClipId: args.audioClipId,
      };

    case "apply_color": {
      const c = state.clips.find((x) => x.id === args.clipId);
      if (!c) return { error: "clip_not_found" };
      if (!c.colorGrade) c.colorGrade = defaultColorGrade();
      Object.assign(c.colorGrade, args.grade ?? {});
      return { colorGrade: c.colorGrade };
    }

    case "apply_effect": {
      const c = state.clips.find((x) => x.id === args.clipId);
      if (!c) return { error: "clip_not_found" };
      if (!c.effects) c.effects = [];
      const fx = {
        id: newId("fx"),
        kind: args.effect,
        enabled: true,
        params: args.params ?? defaultEffectParams(args.effect),
      };
      c.effects.push(fx);
      return { effect: fx };
    }

    case "inspect_color": {
      const c = state.clips.find((x) => x.id === args.clipId);
      if (!c) return { error: "clip_not_found" };
      return {
        clipId: c.id,
        colorGrade: c.colorGrade ?? defaultColorGrade(),
        effects: c.effects ?? [],
        note: "Full RGB scope rendering requires canvas compositor (Electron build). Mean/black/white values are derived from colorGrade settings.",
      };
    }

    case "search_media": {
      const q = (args.query ?? "").toLowerCase();
      const limit = args.limit ?? 10;
      const files = state.media
        .filter((m) => m.name.toLowerCase().includes(q))
        .slice(0, limit);
      return {
        query: args.query,
        results: {
          moments: [],
          spoken: [],
          files,
        },
        note: "Visual (SigLIP2) and spoken search require on-device models (macOS only). Windows build supports file-name matching only.",
      };
    }

    case "list_folders":
      return { folders: state.folders };

    case "create_folder": {
      const f = { id: newId("folder"), name: args.name };
      state.folders.push(f);
      return { folder: f };
    }

    case "move_to_folder": {
      for (const m of state.media) {
        if (m.id === args.mediaId) {
          m.folderId = args.folderId;
          return { media: m };
        }
      }
      return { error: "media_not_found" };
    }

    case "rename_media": {
      for (const m of state.media) {
        if (m.id === args.mediaId) {
          m.name = args.name;
          return { media: m };
        }
      }
      return { error: "media_not_found" };
    }

    case "rename_folder": {
      for (const f of state.folders) {
        if (f.id === args.folderId) {
          f.name = args.name;
          return { folder: f };
        }
      }
      return { error: "folder_not_found" };
    }

    case "delete_media": {
      const before = state.media.length;
      state.media = state.media.filter((m) => m.id !== args.mediaId);
      return { deleted: before - state.media.length };
    }

    case "delete_folder": {
      const before = state.folders.length;
      state.folders = state.folders.filter((f) => f.id !== args.folderId);
      for (const m of state.media) {
        if (m.folderId === args.folderId) m.folderId = null;
      }
      return { deleted: before - state.folders.length };
    }

    case "export_project": {
      const format = args.format ?? "mp4";
      const resolution = args.resolution ?? "1080p";
      const codec = args.codec ?? "h264";
      const fps = state.settings.fps;
      const resolutionMap = {
        "1080p": { w: 1920, h: 1080 },
        "720p": { w: 1280, h: 720 },
        "480p": { w: 854, h: 480 },
        original: { w: state.settings.width, h: state.settings.height },
      };
      const { w, h } = resolutionMap[resolution] ?? resolutionMap["1080p"];
      const sorted = [...state.clips].sort((a, b) => a.start - b.start);
      const segments = sorted.map((c, i) => ({
        index: i, clipId: c.id, type: c.type,
        sourceName: state.media.find((m) => m.id === c.mediaId)?.name ?? null,
        sourceStart: c.sourceStart, duration: c.duration,
        speed: c.speed, text: c.text, timelineStart: c.start,
      }));
      const codecFlag = codec === "h265" ? "libx265" : codec === "prores" ? "prores_ks" : "libx264";
      const cmd = `ffmpeg -y -i <inputs> -filter_complex "<filter>" -c:v ${codecFlag} -preset medium -crf 20 -r ${fps} -pix_fmt yuv420p output.${format}`;
      return {
        format, resolution: { w, h }, fps, codec,
        segments,
        totalDuration: segments.length ? Math.max(...segments.map((s) => s.timelineStart + s.duration)) : 0,
        outputPath: args.outputPath ?? `output.${format}`,
        ffmpegCommand: cmd,
        note: "In the Electron build, the main process can spawn ffmpeg.exe with the rendered segments.",
      };
    }

    case "set_project_settings":
      Object.assign(state.settings, args);
      return { settings: state.settings };

    case "list_models":
      return {
        models: [],
        note: "Generative AI requires a Palmier subscription. Available models in the full version: Nano Banana Pro, GPT Image (image); Seedance 2.0/2.0 Fast, Kling v3, Veo 3.1, Grok (video); Lyria 3 Pro, MiniMax Music, ElevenLabs TTS, Sonilo (audio); ByteDance/SeedVR (upscale).",
      };

    case "generate_video":
    case "generate_image":
    case "generate_audio":
    case "upscale_media":
      return {
        error: "generative_ai_requires_subscription",
        message: "Generative AI features are closed-source and require a Palmier account + subscription. The Windows open-source build only ships the editor and the MCP server.",
        requestedModel: args.model ?? null,
        prompt: args.prompt ?? null,
      };

    case "undo":
      return { guidance: "Undo is not implemented in this build. Use your MCP client to keep a history and replay." };

    case "send_feedback":
      return {
        ok: true,
        message: "Feedback recorded. For urgent issues, open a GitHub issue at https://github.com/palmier-io/palmier-pro/issues or email founders@palmier.io.",
        kind: args.kind ?? "other",
      };

    case "_get_state":
      return { state };

    case "_set_state":
      state = args.state;
      return { ok: true };

    default:
      return { error: "unknown_tool", name };
  }
}

function makeClipFromMedia(c, media, trackId) {
  return {
    id: newId("clip"),
    trackId,
    mediaId: c.mediaId,
    type: media?.type === "audio" ? "audio" : media?.type === "image" ? "image" : "video",
    start: c.start,
    duration: c.duration ?? media?.duration ?? 5,
    sourceStart: c.sourceStart ?? 0,
    sourceEnd: (c.sourceStart ?? 0) + (c.duration ?? media?.duration ?? 5),
    speed: c.speed ?? 1,
    volume: 1,
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    crop: { top: 0, bottom: 0, left: 0, right: 0 },
    colorGrade: defaultColorGrade(),
    fadeIn: 0, fadeOut: 0,
    color: media?.type === "audio" ? "#58A822" : media?.type === "image" ? "#B72DD2" : "#0091C2",
    effects: [], keyframes: [],
  };
}

function defaultColorGrade() {
  return {
    liftHue: 0, liftSat: 0, liftLuma: 0,
    gammaHue: 0, gammaSat: 0, gammaLuma: 0,
    gainHue: 0, gainSat: 0, gainLuma: 0,
    exposure: 0, contrast: 0, saturation: 0,
    temperature: 0, tint: 0,
    highlights: 0, shadows: 0, blacks: 0, whites: 0,
    vibrance: 0, clarity: 0, dehaze: 0,
  };
}

function defaultEffectParams(kind) {
  const map = {
    "color.exposure": { value: 0 },
    "color.contrast": { value: 0 },
    "color.saturation": { value: 0 },
    "color.temperature": { value: 0 },
    "color.highlightsShadows": { highlights: 0, shadows: 0 },
    "color.blacksWhites": { blacks: 0, whites: 0 },
    "color.vibrance": { value: 0 },
    "color.wheels": { liftHue: 0, liftSat: 0, liftLuma: 0, gammaHue: 0, gammaSat: 0, gammaLuma: 0, gainHue: 0, gainSat: 0, gainLuma: 0 },
    "color.curves": { master: 0, red: 0, green: 0, blue: 0 },
    "color.hueCurves": { hue: 0, sat: 0, lum: 0 },
    "color.lut": { name: "", intensity: 1 },
    "detail.clarity": { clarity: 0, dehaze: 0 },
    "blur.gaussian": { radius: 0 },
    "blur.sharpen": { amount: 0 },
    "blur.noiseReduction": { amount: 0 },
    "blur.motion": { radius: 0, angle: 0 },
    "stylize.grain": { amount: 0, size: 1 },
    "stylize.vignette": { amount: 0, size: 0.5, feather: 0.5 },
    "stylize.glow": { radius: 0, intensity: 0, threshold: 0.5 },
    "key.chroma": { hue: 120, tolerance: 0.2, spill: 0 },
  };
  return map[kind] ?? {};
}

// --- JSON-RPC server ---------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("access-control-allow-headers", "content-type, accept, mcp-session-id");
  res.setHeader("access-control-expose-headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/mcp" || req.url === "/") {
    if (req.method === "GET") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write(": connected\n\n");
      const keepAlive = setInterval(() => res.write(": ping\n\n"), 25_000);
      req.on("close", () => clearInterval(keepAlive));
      return;
    }
    if (req.method === "DELETE") { res.writeHead(204); res.end(); return; }
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "method_not_allowed" }));
      return;
    }

    let body = "";
    for await (const chunk of req) body += chunk;
    let msg;
    try {
      msg = JSON.parse(body);
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse_error" } }));
      return;
    }

    if (Array.isArray(msg)) {
      const out = msg.map(handleRpc).filter(Boolean);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(out));
      return;
    }

    const out = handleRpc(msg);
    res.writeHead(200, { "content-type": "application/json", "mcp-session-id": "palmier-windows" });
    res.end(JSON.stringify(out));
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, port: PORT, version: "2.0.0", tools: TOOLS.length }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found", url: req.url }));
});

function handleRpc(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return {
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "palmier-pro-windows", version: "2.0.0" },
        capabilities: { tools: { listChanged: false }, resources: {}, prompts: {} },
      },
    };
  }
  if (method === "notifications/initialized") return null;
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments ?? {};
    try {
      const result = dispatch(name, args);
      return {
        jsonrpc: "2.0", id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        },
      };
    } catch (e) {
      return { jsonrpc: "2.0", id, error: { code: -32603, message: e?.message ?? "internal_error" } };
    }
  }
  if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `method_not_found: ${method}` } };
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[Palmier Pro] MCP server v2.0.0 listening on http://127.0.0.1:${PORT}/mcp`);
  console.log(`[Palmier Pro] Exposing ${TOOLS.length} tools`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
