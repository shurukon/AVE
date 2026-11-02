"use client";

import { useRef, useState } from "react";
import { usePalmier } from "@/lib/palmier/store";
import { MediaAsset, newId } from "@/lib/palmier/types";
import {
  Upload, FilmIcon, MusicIcon, ImageIcon, Trash2, Plus,
  FolderIcon, Search, FolderPlus, MoreVertical, Sparkles,
  TextGlyph, MessageSquare,
} from "@/components/palmier/icons";
import { cn } from "@/lib/utils";

function detectType(file: File): MediaAsset["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return "video";
}

function probeDuration(url: string, type: MediaAsset["type"]): Promise<number> {
  return new Promise((resolve) => {
    if (type === "image") return resolve(5);
    if (type === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve(isFinite(v.duration) ? v.duration : 5);
      v.onerror = () => resolve(5);
      v.src = url;
    } else if (type === "audio") {
      const a = document.createElement("audio");
      a.preload = "metadata";
      a.onloadedmetadata = () => resolve(isFinite(a.duration) ? a.duration : 5);
      a.onerror = () => resolve(5);
      a.src = url;
    } else { resolve(5); }
  });
}

export function MediaPanel() {
  const media = usePalmier((s) => s.project.media);
  const folders = usePalmier((s) => s.project.folders);
  const tracks = usePalmier((s) => s.project.tracks);
  const addMedia = usePalmier((s) => s.addMedia);
  const removeMedia = usePalmier((s) => s.removeMedia);
  const renameMedia = usePalmier((s) => s.renameMedia);
  const addClipFromMedia = usePalmier((s) => s.addClipFromMedia);
  const showToast = usePalmier((s) => s.showToast);
  const addFolder = usePalmier((s) => s.addFolder);
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"media" | "captions" | "music">("media");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const type = detectType(file);
      const duration = await probeDuration(url, type);
      let dims: { w?: number; h?: number; thumbnail?: string } = {};
      if (type === "image") {
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            dims = { w: img.naturalWidth, h: img.naturalHeight, thumbnail: url };
            resolve();
          };
          img.onerror = () => resolve();
        });
      } else if (type === "video") {
        const thumb = await new Promise<string>((resolve) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.muted = true;
          v.onloadeddata = () => {
            try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch { resolve(""); }
          };
          v.onseeked = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = 160;
              canvas.height = (160 * (v.videoHeight || 9)) / (v.videoWidth || 16);
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(v, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/jpeg", 0.6));
            } catch { resolve(""); }
          };
          v.onerror = () => resolve("");
          v.src = url;
        });
        dims = { thumbnail: thumb };
      }
      const asset: MediaAsset = {
        id: newId("media"),
        name: file.name,
        type, url, duration,
        size: file.size,
        folderId: selectedFolder,
        ...dims,
      };
      addMedia(asset);
    }
    showToast(`${files.length} asset(s) imported`);
  };

  const onAddToTimeline = (m: MediaAsset) => {
    const kind = m.type === "video" || m.type === "image" ? "video" : m.type === "audio" ? "audio" : "video";
    const track = tracks.find((t) => t.kind === kind) ?? tracks[0];
    if (!track) return;
    const end = usePalmier.getState().project.clips
      .filter((c) => c.trackId === track.id)
      .reduce((max, c) => Math.max(max, c.start + c.duration), 0);
    const clip = addClipFromMedia(m.id, track.id, end);
    if (clip) showToast("Clip added", `${m.name} → ${track.name}`);
  };

  const filtered = query
    ? media.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    : selectedFolder
      ? media.filter((m) => m.folderId === selectedFolder)
      : media.filter((m) => !m.folderId);

  return (
    <div
      className="flex h-full flex-col bg-[var(--bg-surface)]"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); void onFiles(e.dataTransfer.files); }}
    >
      <div className="panel-header justify-between">
        <div className="flex items-center gap-2">
          <FolderIcon size={11} />
          <span className="panel-header-title">Media</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="tool-btn h-5 w-5" onClick={() => addFolder("New Folder")} title="New folder">
            <FolderPlus size={11} />
          </button>
          <button className="capsule" onClick={() => fileInput.current?.click()}>
            <Upload size={10} /> Import
          </button>
          <input ref={fileInput} type="file" multiple accept="video/*,audio/*,image/*" className="hidden"
            onChange={(e) => onFiles(e.target.files)} />
        </div>
      </div>

      {/* Tab rail */}
      <div className="flex border-b border-[var(--border-primary)] bg-[var(--bg-raised)]">
        {(["media", "captions", "music"] as const).map((t) => (
          <button key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "flex-1 h-7 text-[10px] font-medium uppercase tracking-[1px] transition relative",
              activeTab === t
                ? "text-white"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
            )}>
            {t === "media" ? <FolderIcon size={10} className="inline mr-1" /> :
             t === "captions" ? <MessageSquare size={10} className="inline mr-1" /> :
             <MusicIcon size={10} className="inline mr-1" />}
            {t}
            {activeTab === t ? (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-warm)]" />
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "media" ? (
        <>
          {/* Search + folder filter */}
          <div className="border-b border-[var(--border-primary)] p-2 space-y-2">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                className="search-input"
                placeholder="Search media..."
                value={query}
                onChange={(e) => setQuery(e.target.value)} />
            </div>
            {folders.length > 0 ? (
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] transition",
                    selectedFolder === null
                      ? "bg-white/10 text-white"
                      : "text-[var(--text-tertiary)] hover:bg-white/5",
                  )}
                  onClick={() => setSelectedFolder(null)}>
                  <FolderIcon size={10} /> All
                </button>
                {folders.map((f) => (
                  <button key={f.id}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] transition",
                      selectedFolder === f.id
                        ? "bg-white/10 text-white"
                        : "text-[var(--text-tertiary)] hover:bg-white/5",
                    )}
                    onClick={() => setSelectedFolder(f.id)}>
                    <FolderIcon size={10} /> {f.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Tile grid */}
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className={cn(
                "m-1 flex flex-col items-center justify-center rounded-[10px] border-2 border-dashed p-8 text-center text-[11px] text-[var(--text-tertiary)] transition",
                dragOver ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/[0.04]" : "border-[var(--border-primary)]",
              )}>
                <Upload size={28} className="mb-3 opacity-40" />
                <div className="font-medium text-white text-[13px] mb-1">Drop files here</div>
                <div className="text-[var(--text-tertiary)]">or click Import</div>
                <div className="mt-3 text-[9px] text-[var(--text-muted)] uppercase tracking-[1.5px]">
                  MP4 · MOV · WebM · MP3 · WAV · PNG · JPG
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filtered.map((m) => (
                  <MediaTile key={m.id} m={m}
                    onAdd={() => onAddToTimeline(m)}
                    onRemove={() => removeMedia(m.id)}
                    onRename={(name) => renameMedia(m.id, name)} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {activeTab === "captions" ? (
        <div className="flex-1 overflow-y-auto p-3.5">
          <div className="rounded-md border border-[var(--border-subtle)] bg-white/[0.02] p-3 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
            <div className="flex items-center gap-2 font-medium text-white mb-2">
              <MessageSquare size={11} /> Captions
            </div>
            On-device transcription runs on macOS (Speech framework). In the Windows build, pair Palmier with a Whisper MCP server or upload a .srt/.vtt file via the Agent panel.
            <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <Sparkles size={10} className="text-[var(--accent-timecode)]" />
              Tip: Ask the agent to "Generate captions in Arabic".
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "music" ? (
        <div className="flex-1 overflow-y-auto p-3.5">
          <div className="rounded-md border border-[var(--border-subtle)] bg-white/[0.02] p-3 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
            <div className="flex items-center gap-2 font-medium text-white mb-2">
              <MusicIcon size={11} /> Music Generation
            </div>
            AI music generation (Lyria 3 Pro, MiniMax Music, ElevenLabs) requires a Palmier subscription. Import audio files via the Media tab to add music to your timeline.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MediaTile({
  m, onAdd, onRemove, onRename,
}: {
  m: MediaAsset;
  onAdd: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const typeColor =
    m.type === "video" ? "var(--track-video)" :
    m.type === "audio" ? "var(--track-audio)" :
    m.type === "image" ? "var(--track-image)" :
    "var(--text-muted)";

  return (
    <div
      className="media-tile group"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/palmier-media", m.id)}
      title={m.name}
    >
      <div className="relative aspect-video bg-black">
        {m.thumbnail ? (
          <img src={m.thumbnail} alt={m.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)]">
            {m.type === "audio" ? <MusicIcon size={20} /> :
             m.type === "image" ? <ImageIcon size={20} /> :
             <FilmIcon size={20} />}
          </div>
        )}
        {/* Type badge (top-left) */}
        <div className="absolute top-1 left-1 rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white"
          style={{ background: "rgba(0,0,0,0.7)" }}>
          {m.type}
        </div>
        {/* Duration badge (bottom-right) */}
        <div className="absolute bottom-1 right-1 duration-badge">
          {m.duration.toFixed(1)}s
        </div>
        {/* Hover action — add to timeline */}
        <button
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 border border-white/15 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
          onClick={onAdd}
          title="Add to timeline"
        >
          <Plus size={10} />
        </button>
      </div>
      {/* Bottom: name + 2px color strip if on timeline */}
      <div className="px-1.5 py-1">
        <div className="truncate text-[10px] text-[var(--text-secondary)]" title={m.name}>{m.name}</div>
      </div>
      <div className="h-0.5" style={{ background: typeColor }} />
      {/* Context menu */}
      {menuOpen ? (
        <div className="absolute right-1 top-7 z-10 rounded border border-[var(--border-primary)] bg-[var(--bg-raised)] p-1 text-[10px] shadow-lg">
          <button className="block w-full rounded px-2 py-1 text-left hover:bg-white/5"
            onClick={() => {
              const newName = prompt("Rename to:", m.name);
              if (newName) onRename(newName);
              setMenuOpen(false);
            }}>
            Rename
          </button>
          <button className="block w-full rounded px-2 py-1 text-left hover:bg-[var(--status-error)]/20 hover:text-[var(--status-error)]"
            onClick={() => { onRemove(); setMenuOpen(false); }}>
            Remove
          </button>
        </div>
      ) : null}
      <button
        className="absolute top-1 right-7 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
        onClick={() => setMenuOpen(!menuOpen)}
        title="More"
      >
        <MoreVertical size={10} />
      </button>
    </div>
  );
}
