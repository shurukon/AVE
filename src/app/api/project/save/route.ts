/**
 * POST /api/project/save
 * Returns the project as a downloadable .palmier JSON file.
 * Body: the full Project object.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const project = await req.json().catch(() => null);
  if (!project || typeof project !== "object") {
    return NextResponse.json({ error: "invalid_project" }, { status: 400 });
  }
  const json = JSON.stringify(project, null, 2);
  const name = (project.settings?.name ?? "project").replace(/[^\w-]+/g, "_");
  return new NextResponse(json, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${name}.palmier.json"`,
    },
  });
}
