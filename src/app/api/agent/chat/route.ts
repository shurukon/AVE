/**
 * POST /api/agent/chat
 * Streams an assistant reply for the in-app agent panel.
 *
 * Uses z-ai-web-dev-sdk (server-side only). System prompt mirrors the
 * Palmier Pro agent persona: a quiet, capable editor that knows the user
 * can call MCP tools from their own client (Claude Code, Cursor, etc.).
 *
 * If the user includes the marker "@palmier", we suggest MCP tool calls
 * they can make against the local MCP server.
 */
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the Palmier Pro assistant — a quiet, capable video editor that lives inside the Palmier Pro for Windows app.

Your job:
- Help the user plan edits, write scripts, and reason about their timeline.
- Be direct and technical. No chatty warmth, no marketing.
- When the user asks for a concrete timeline operation (cut, split, trim, add text, generate captions, export), tell them the exact MCP tool to call and the JSON arguments to pass. The MCP server runs at http://127.0.0.1:19789/mcp and exposes tools like:
  - get_timeline, get_media, inspect_media, get_transcript
  - add_clips, insert_clips, remove_clips, move_clips, split_clips
  - set_clip_properties, set_keyframes, ripple_delete_ranges, remove_words
  - add_texts, add_captions, sync_audio, apply_color, apply_effect
  - generate_video, generate_image, generate_audio, upscale_media
  - export_project, list_models, set_project_settings
- The user may also connect Claude Code, Cursor, or Claude Desktop to that same URL.
- If the user asks you to perform the action yourself, explain that the in-app panel only advises; concrete edits go through their MCP client (Claude Code / Cursor / Claude Desktop) which connects to the same local server.

Keep replies short and scannable. Use short bullet lists for tool-call suggestions. Never fabricate tool names that aren't in the list above.`;

export async function POST(req: NextRequest) {
  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...incoming
      .filter((m) => m && typeof m.content === "string")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
  ];

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.4,
      max_tokens: 900,
      stream: false,
    });

    const content =
      completion.choices?.[0]?.message?.content ??
      completion.choices?.[0]?.delta?.content ??
      "";

    return NextResponse.json({ content: String(content).trim() });
  } catch (e) {
    return NextResponse.json(
      { error: "agent_failed", message: (e as Error).message },
      { status: 502 },
    );
  }
}
