/**
 * POST /api/mcp/proxy
 * Forwards a JSON-RPC request to the bundled MCP HTTP server.
 * Used by the in-app agent panel to call MCP tools without CORS issues.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_PORT = Number(process.env.PALMIER_MCP_PORT ?? 19789);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const url = `http://127.0.0.1:${DEFAULT_PORT}/mcp`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = r.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      const text = await r.text();
      // Extract first data: line
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          try {
            return NextResponse.json(JSON.parse(data));
          } catch {
            /* ignore */
          }
        }
      }
      return NextResponse.json({ raw: text });
    }

    const json = await r.json().catch(() => ({}));
    return NextResponse.json(json, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: (body as { id?: unknown })?.id ?? null,
        error: {
          code: -32603,
          message: `MCP server unreachable on port ${DEFAULT_PORT}. Make sure Palmier Pro is running. (${(e as Error).message})`,
        },
      },
      { status: 502 },
    );
  }
}
