/**
 * GET /api/mcp/status
 * Reports whether the bundled MCP server is reachable and on which port.
 *
 * In the Electron desktop build, the MCP server is a child process spawned
 * by the main process; this endpoint pings it to confirm reachability.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_PORT = Number(process.env.PALMIER_MCP_PORT ?? 19789);

export async function GET() {
  const port = DEFAULT_PORT;
  const url = `http://127.0.0.1:${port}/mcp`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "palmier-windows-probe", version: "1.0.0" },
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const ok = r.ok || r.status === 202 || r.status === 400;
    return NextResponse.json({
      connected: ok,
      port,
      url,
      status: r.status,
    });
  } catch {
    return NextResponse.json({ connected: false, port, url });
  }
}
