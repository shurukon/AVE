# Palmier Pro for Windows — MCP Tools (v2.1)

This document lists all 42 MCP tools exposed by the Palmier Pro MCP server at `http://127.0.0.1:19789/mcp`.

## Comparison with macOS Original

The macOS version of Palmier Pro exposes **40 tools** through its Swift MCP SDK. This Windows port exposes **42 tools** — **40 public tools matching the macOS original 100%**, plus **2 internal state-sync tools** (`_get_state` / `_set_state`) used by the Electron shell to keep the UI and MCP server in sync.

| | macOS Original | Windows Port |
|---|---|---|
| Public tools | 40 | 40 (100% match) |
| Internal tools | 0 | 2 (`_get_state`, `_set_state`) |
| **Total** | **40** | **42** |

### Missing from Windows: 0
### Extra in Windows: 0 (beyond the 2 internal sync tools)

## Tool Categories

### 1. Timeline Inspection (2 tools)
| Tool | Description |
|------|-------------|
| `get_timeline` | Returns project settings, track list, all clips with properties, canGenerate flag. Always call first. |
| `inspect_timeline` | Render composited frames at specific positions for visual edit verification. |

### 2. Media Management (8 tools)
| Tool | Description |
|------|-------------|
| `get_media` | List all media assets with generationStatus. |
| `inspect_media` | Look at a media asset (images: dimensions+EXIF, video: frames+transcript, audio: transcript). |
| `import_media` | Register a media asset by file path. |
| `list_folders` | List all media folders. |
| `create_folder` | Create a new media folder. |
| `move_to_folder` | Move a media asset into a folder. |
| `rename_media` | Rename a media asset. |
| `delete_media` | Delete a media asset by id. |
| `rename_folder` | Rename a media folder. |
| `delete_folder` | Delete a media folder (assets inside move to root). |

### 3. Clip Operations (9 tools)
| Tool | Description |
|------|-------------|
| `add_clips` | Append clips referencing mediaId onto a track. |
| `insert_clips` | Ripple insert: split clips at insert point, push others right. |
| `remove_clips` | Remove clips by id. |
| `move_clips` | Move clips to new start time / track. |
| `set_clip_properties` | Patch clip properties (transform, color, text, ...). |
| `set_keyframes` | Replace keyframe track for properties on a clip. |
| `split_clips` | Split clips at given times. |
| `ripple_delete_ranges` | Delete time ranges and close the gap. |
| `remove_tracks` | Remove tracks by id (and their clips). |

### 4. Text & Captions (4 tools)
| Tool | Description |
|------|-------------|
| `add_texts` | Add text clips with style. |
| `add_captions` | Generate captions (stub — returns guidance). |
| `remove_words` | Remove words by global index (stub). |
| `get_transcript` | Get timeline transcript (stub). |

### 5. Audio (1 tool)
| Tool | Description |
|------|-------------|
| `sync_audio` | Synchronize audio with video (stub — returns guidance). |

### 6. Color & Effects (3 tools)
| Tool | Description |
|------|-------------|
| `apply_color` | Apply color grade / LUT to a clip. |
| `apply_effect` | Apply an effect (vignette, glow, grain, ...) to a clip. 20 effect kinds supported. |
| `inspect_color` | Inspect color scopes (histogram, waveform, vectorscope). |

### 7. Search (1 tool)
| Tool | Description |
|------|-------------|
| `search_media` | Semantic visual + spoken search. Returns Moments/Spoken/Files groups. |

### 8. Export & Project Settings (2 tools)
| Tool | Description |
|------|-------------|
| `export_project` | Render timeline to video. Returns FFmpeg command + render plan. |
| `set_project_settings` | Patch project settings (name, fps, width, height, backgroundColor). |

### 9. AI Generation (5 tools)
| Tool | Description |
|------|-------------|
| `list_models` | List available generative AI models. |
| `generate_video` | Generate video with AI (Seedance/Kling/Veo/Grok). |
| `generate_image` | Generate image with AI (Nano Banana Pro/GPT Image). |
| `generate_audio` | Generate audio with AI (Lyria/MiniMax/ElevenLabs). |
| `upscale_media` | Upscale media with AI (ByteDance/SeedVR). |

### 10. Undo, Feedback & Skills (3 tools)
| Tool | Description |
|------|-------------|
| `undo` | Undo last change (stub). |
| `send_feedback` | Send bug/feature reports to Palmier team. |
| `read_skill` | Load the full instructions for one of the skills listed under # Skills in your system prompt. Skills live as SKILL.md files under `~/.palmier/skills/<id>/`. |

### 11. Internal (2 tools)
| Tool | Description |
|------|-------------|
| `_get_state` | Internal: return full in-memory project state. |
| `_set_state` | Internal: replace full in-memory project state. |

## Effects Catalog (20 effect kinds)

When calling `apply_effect`, you can pass any of these effect kinds:

### Color (11 effects)
- `color.exposure`, `color.contrast`, `color.saturation`, `color.temperature`
- `color.highlightsShadows`, `color.blacksWhites`, `color.vibrance`
- `color.wheels` (Lift/Gamma/Gain), `color.curves` (master+RGB)
- `color.hueCurves` (hue/sat/lum), `color.lut`

### Detail (1 effect)
- `detail.clarity` (clarity + dehaze)

### Blur (4 effects)
- `blur.gaussian`, `blur.sharpen`, `blur.noiseReduction`, `blur.motion`

### Stylize (3 effects)
- `stylize.grain`, `stylize.vignette`, `stylize.glow`

### Key (1 effect)
- `key.chroma` (chroma key / green screen)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `S` | Split at playhead |
| `Delete` / `Backspace` | Delete selected clip |
| `V` | Select tool |
| `B` | Razor tool |
| `R` | Ripple Trim tool |
| `I` | Mark In |
| `O` | Mark Out |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `Home` | Jump to start |
| `End` | Jump to end |
| `Ctrl+S` | Save project |
| `Ctrl+E` | Export |
| `Shift+S` | Toggle scopes |
| `Shift+A` | Toggle agent panel |
