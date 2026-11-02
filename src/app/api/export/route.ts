/**
 * POST /api/export
 * Builds an FFmpeg command for the current project + clips.
 *
 * In the browser build we return the command string and a render plan the
 * client can run with ffmpeg.wasm. In the Electron build, the main process
 * can shell out to a bundled ffmpeg.exe to actually render the file.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface ExportBody {
  project: {
    settings: { name: string; fps: number; width: number; height: number };
    clips: Array<{
      id: string;
      type: string;
      mediaId?: string;
      start: number;
      duration: number;
      sourceStart: number;
      sourceEnd: number;
      speed: number;
      text?: string;
    }>;
    media: Array<{ id: string; name: string; url: string; type: string }>;
  };
  format: "mp4" | "webm" | "mov" | "gif";
  resolution: "1080p" | "720p" | "480p" | "original";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as ExportBody | null;
  if (!body?.project) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { project, format, resolution } = body;
  const fps = project.settings.fps || 30;

  const resolutionMap: Record<string, { w: number; h: number }> = {
    "1080p": { w: 1920, h: 1080 },
    "720p": { w: 1280, h: 720 },
    "480p": { w: 854, h: 480 },
    original: { w: project.settings.width, h: project.settings.height },
  };
  const { w, h } = resolutionMap[resolution] ?? resolutionMap["1080p"];

  // Sort clips by start time
  const sorted = [...project.clips].sort((a, b) => a.start - b.start);

  // Build a render plan: ordered list of segments the client/electron can feed to FFmpeg
  const segments = sorted.map((c, i) => {
    const media = project.media.find((m) => m.id === c.mediaId);
    return {
      index: i,
      clipId: c.id,
      type: c.type,
      source: media?.url ?? null,
      sourceName: media?.name ?? "(no media)",
      sourceStart: c.sourceStart,
      duration: c.duration,
      speed: c.speed,
      text: c.text,
      timelineStart: c.start,
    };
  });

  // Build an example FFmpeg command (concat demuxer approach for video segments)
  const filterComplex = `nullsrc=s=${w}x${h}:r=${fps} [base];` +
    segments
      .map((seg, i) => {
        if (seg.type === "text") {
          return `drawtext=text='${(seg.text ?? "").replace(/'/g, "\\'")}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${seg.timelineStart},${seg.timelineStart + seg.duration})' [v${i}]; [base][v${i}] overlay [base]`;
        }
        return null;
      })
      .filter(Boolean)
      .join("; ");

  const cmd = `ffmpeg -y -i <inputs> -filter_complex "${filterComplex}" -c:v libx264 -preset medium -crf 20 -r ${fps} -pix_fmt yuv420p output.${format}`;

  return NextResponse.json({
    ok: true,
    format,
    resolution: { w, h },
    fps,
    segments,
    ffmpegCommand: cmd,
    totalDuration: segments.length
      ? Math.max(...segments.map((s) => s.timelineStart + s.duration))
      : 0,
  });
}
