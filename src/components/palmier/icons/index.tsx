/**
 * Palmier Pro — Custom SVG icon set.
 * Designed to mirror SF Symbols used in the macOS app.
 * Each icon is a 24x24 viewBox, stroke-based, inherits currentColor.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function makeIcon(path: React.ReactNode) {
  return function Icon({ size = 16, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {path}
      </svg>
    );
  };
}

// ---- Tools (cursor, razor, etc.) ----
export const CursorArrow = makeIcon(
  <path d="M5 3l14 8-6 1.5L9 19l-4-16z" fill="currentColor" stroke="none" />,
);

export const Razor = makeIcon(
  <>
    <path d="M3 21l5-5" />
    <path d="M14 4l6 6-9 9-6-6 9-9z" />
    <path d="M10 8l6 6" />
  </>,
);

export const RippleTrim = makeIcon(
  <>
    <path d="M4 12h4" />
    <path d="M16 12h4" />
    <path d="M9 8l-2 4 2 4" />
    <path d="M15 8l2 4-2 4" />
  </>,
);

export const RippleInsert = makeIcon(
  <>
    <path d="M12 4v16" />
    <path d="M8 8l-3 4 3 4" />
    <path d="M16 8l3 4-3 4" />
  </>,
);

export const RangeSelect = makeIcon(
  <>
    <path d="M4 6v12" />
    <path d="M20 6v12" />
    <path d="M4 6h4l-2-2 2-2" transform="translate(0 -2)" />
    <path d="M16 6h4l-2-2 2-2" transform="translate(0 -2)" />
    <path d="M4 18h4l-2 2 2 2" transform="translate(0 -2)" />
    <path d="M16 18h4l-2 2 2 2" transform="translate(0 -2)" />
  </>,
);

export const Scissors = makeIcon(
  <>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4L8.12 15.88" />
    <path d="M14.47 14.48L20 20" />
    <path d="M8.12 8.12L12 12" />
  </>,
);

export const SplitClip = makeIcon(
  <>
    <path d="M12 3v18" strokeDasharray="2 2" />
    <path d="M8 7l-4 5 4 5" />
    <path d="M16 7l4 5-4 5" />
  </>,
);

// ---- Transport ----
export const Play = makeIcon(
  <path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none" />,
);

export const Pause = makeIcon(
  <>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  </>,
);

export const SkipBack = makeIcon(
  <>
    <path d="M19 5L9 12l10 7V5z" fill="currentColor" stroke="none" />
    <rect x="5" y="5" width="2" height="14" rx="0.5" fill="currentColor" stroke="none" />
  </>,
);

export const SkipForward = makeIcon(
  <>
    <path d="M5 5l10 7-10 7V5z" fill="currentColor" stroke="none" />
    <rect x="17" y="5" width="2" height="14" rx="0.5" fill="currentColor" stroke="none" />
  </>,
);

// ---- Mark In/Out (bracket glyphs) ----
export const MarkIn = makeIcon(
  <>
    <path d="M7 4v16" />
    <path d="M7 4h6l-4 4h-2" fill="currentColor" stroke="none" />
    <path d="M7 20h6l-4-4h-2" fill="currentColor" stroke="none" />
  </>,
);

export const MarkOut = makeIcon(
  <>
    <path d="M17 4v16" />
    <path d="M17 4h-6l4 4h2" fill="currentColor" stroke="none" />
    <path d="M17 20h-6l4-4h2" fill="currentColor" stroke="none" />
  </>,
);

// ---- T (text glyph, serif bold) ----
export function TextGlyph({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <text x="12" y="18" textAnchor="middle" fontSize="18" fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif" fill="currentColor">T</text>
    </svg>
  );
}

// ---- Brand / sparkle ----
export const Sparkles = makeIcon(
  <>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="currentColor" stroke="none" />
    <path d="M19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14z" fill="currentColor" stroke="none" opacity="0.7" />
  </>,
);

// ---- Wand (effects / AI) ----
export const Wand = makeIcon(
  <>
    <path d="M15 4l5 5L8 21l-5-5L15 4z" />
    <path d="M14 5l5 5" />
    <circle cx="19" cy="5" r="0.5" fill="currentColor" />
    <circle cx="21" cy="3" r="0.5" fill="currentColor" />
    <circle cx="21" cy="8" r="0.5" fill="currentColor" />
  </>,
);

// Alias Wand2 → Wand (used by Inspector + Toolbar)
export const Wand2 = Wand;

// ---- Activity / scopes ----
export const Activity = makeIcon(
  <path d="M3 12h3l3-9 4 18 3-9h5" />,
);

// ---- Bot (agent) ----
export const Bot = makeIcon(
  <>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <circle cx="9" cy="14" r="1.5" fill="currentColor" />
    <circle cx="15" cy="14" r="1.5" fill="currentColor" />
    <path d="M12 4v4" />
    <circle cx="12" cy="3" r="1" fill="currentColor" />
  </>,
);

// ---- Track-type icons ----
export const FilmIcon = makeIcon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 5v14M17 5v14M3 9h4M3 13h4M3 17h4M17 9h4M17 13h4M17 17h4" />
  </>,
);

export const MusicIcon = makeIcon(
  <>
    <path d="M9 18V5l10-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </>,
);

export const ImageIcon = makeIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </>,
);

// ---- Folder ----
export const FolderIcon = makeIcon(
  <path d="M3 7l2-3h5l2 2h7v12H3V7z" fill="currentColor" stroke="currentColor" strokeWidth={1} fillOpacity={0.3} />,
);

export const FolderPlus = makeIcon(
  <>
    <path d="M3 7l2-3h5l2 2h7v12H3V7z" />
    <path d="M12 11v6M9 14h6" />
  </>,
);

// ---- Common actions ----
export const Upload = makeIcon(
  <>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M12 4v12" />
  </>,
);

export const Download = makeIcon(
  <>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 4v11" />
  </>,
);

export const Save = makeIcon(
  <>
    <path d="M5 3h11l3 3v15H5V3z" />
    <path d="M8 3v5h8" />
    <path d="M8 14h8v7H8z" />
  </>,
);

export const FolderOpen = makeIcon(
  <>
    <path d="M3 7l2-3h5l2 2h7v12H3V7z" />
    <path d="M3 13h18l-2 6H3" />
  </>,
);

export const Search = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </>,
);

export const Trash = makeIcon(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </>,
);

// Alias Trash2 → Trash
export const Trash2 = Trash;

export const Plus = makeIcon(
  <path d="M12 5v14M5 12h14" />,
);

export const X = makeIcon(
  <path d="M6 6l12 12M18 6L6 18" />,
);

export const ChevronDown = makeIcon(
  <path d="M6 9l6 6 6-6" />,
);

export const ChevronRight = makeIcon(
  <path d="M9 6l6 6-6 6" />,
);

export const ChevronLeft = makeIcon(
  <path d="M15 6l-6 6 6 6" />,
);

export const Check = makeIcon(
  <path d="M5 12l5 5L20 7" />,
);

export const Eye = makeIcon(
  <>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOff = makeIcon(
  <>
    <path d="M2 12s4-7 10-7c2 0 4 .8 5.5 1.8" />
    <path d="M22 12s-4 7-10 7c-2 0-4-.8-5.5-1.8" />
    <path d="M3 3l18 18" />
  </>,
);

export const Lock = makeIcon(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </>,
);

export const Unlock = makeIcon(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 017-2.7" />
  </>,
);

export const Volume = makeIcon(
  <>
    <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" stroke="none" />
    <path d="M16 8a5 5 0 010 8" />
    <path d="M19 5a9 9 0 010 14" />
  </>,
);

export const VolumeMute = makeIcon(
  <>
    <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" stroke="none" />
    <path d="M22 9l-5 5M17 9l5 5" />
  </>,
);

// Aliases for compatibility (Volume2 / VolumeX / VolumeMute all map to Volume / VolumeMute)
export const Volume2 = Volume;
export const VolumeX = VolumeMute;

export const Link = makeIcon(
  <>
    <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
    <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
  </>,
);

// Alias Link2 → Link (used by Timeline)
export const Link2 = Link;

export const Copy = makeIcon(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </>,
);

export const Plug = makeIcon(
  <path d="M9 7V3M15 7V3M7 7h10v5a5 5 0 01-10 0V7zM12 17v4" />,
);

export const Send = makeIcon(
  <>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="currentColor" stroke="none" opacity="0.2" />
  </>,
);

export const Settings = makeIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" />
  </>,
);

export const Sliders = makeIcon(
  <>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
    <circle cx="4" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="10" r="2" fill="currentColor" />
    <circle cx="20" cy="14" r="2" fill="currentColor" />
  </>,
);

export const Palette = makeIcon(
  <>
    <path d="M12 2a10 10 0 100 20c1 0 2-1 2-2v-1c0-1 1-2 2-2h1c2 0 3-1 3-3a8 8 0 00-8-8z" />
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
  </>,
);

export const Sun = makeIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </>,
);

export const Contrast = makeIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v20" />
    <path d="M12 2a10 10 0 010 20V2z" fill="currentColor" stroke="none" />
  </>,
);

export const Droplet = makeIcon(
  <path d="M12 2.7l5.7 6.4a8 8 0 11-11.4 0L12 2.7z" />,
);

export const Layers = makeIcon(
  <>
    <path d="M12 2L2 8l10 6 10-6-10-6z" />
    <path d="M2 14l10 6 10-6" />
    <path d="M2 11l10 6 10-6" />
  </>,
);

export const Crop = makeIcon(
  <>
    <path d="M6 2v14a2 2 0 002 2h14" />
    <path d="M2 6h14a2 2 0 012 2v14" />
  </>,
);

export const Move = makeIcon(
  <>
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
    <path d="M2 12h20M12 2v20" />
  </>,
);

export const Rotate = makeIcon(
  <>
    <path d="M3 12a9 9 0 109-9" />
    <path d="M3 5v4h4" />
  </>,
);

export const Maximize = makeIcon(
  <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3" />,
);

export const Minimize = makeIcon(
  <path d="M8 3v3a2 2 0 01-2 2H3M16 3v3a2 2 0 002 2h3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3" />,
);

export const Undo = makeIcon(
  <>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 00-15-6.7L3 13" />
  </>,
);

export const Redo = makeIcon(
  <>
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0115-6.7L21 13" />
  </>,
);

export const Github = makeIcon(
  <path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.300-4.5-1.1-4.5-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1 .8-.2 1.7-.3 2.5-.3.9 0 1.7.1 2.5.3 1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.5 5 .3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5 3.9-1.3 6.8-5.1 6.8-9.5C22 6.5 17.5 2 12 2z" fill="currentColor" stroke="none" />,
);

export const Server = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="6" rx="1" />
    <rect x="3" y="14" width="18" height="6" rx="1" />
    <circle cx="7" cy="7" r="0.5" fill="currentColor" />
    <circle cx="7" cy="17" r="0.5" fill="currentColor" />
  </>,
);

export const CheckCircle = makeIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-5" />
  </>,
);

export const XCircle = makeIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 8l8 8M16 8l-8 8" />
  </>,
);

export const Terminal = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9l3 3-3 3" />
    <path d="M13 15h4" />
  </>,
);

export const MessageSquare = makeIcon(
  <path d="M21 11.5a8.4 8.4 0 01-9 8.4L3 21l1.1-9A8.4 8.4 0 1121 11.5z" />,
);

export const FileText = makeIcon(
  <>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </>,
);

export const ZoomIn = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
    <path d="M11 8v6M8 11h6" />
  </>,
);

export const ZoomOut = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
    <path d="M8 11h6" />
  </>,
);

export const MoreVertical = makeIcon(
  <>
    <circle cx="12" cy="5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
  </>,
);

export const GripVertical = makeIcon(
  <>
    <circle cx="9" cy="6" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="18" r="1" fill="currentColor" />
    <circle cx="15" cy="6" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="18" r="1" fill="currentColor" />
  </>,
);

// ---- Status bar / MCP indicators ----
export const Bell = makeIcon(
  <>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 01-3.4 0" />
  </>,
);
