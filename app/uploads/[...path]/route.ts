import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { contentTypeFor, resolveUploadPath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Tidak memiliki akses.", { status: 401 });
  }

  const { path: segments } = await params;
  const target = resolveUploadPath(segments.join("/"));
  if (!target) {
    return new NextResponse("Tidak ditemukan.", { status: 404 });
  }

  const file = await fs.readFile(target).catch(() => null);
  if (!file) {
    return new NextResponse("Tidak ditemukan.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": contentTypeFor(target),
      "Content-Length": String(file.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
