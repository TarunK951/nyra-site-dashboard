import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  getBlobReadWriteToken,
  videoUploadNotConfiguredMessage,
} from "@/lib/cms-upload-env";
import { extractMessage } from "@/lib/content-api";
import { getApiBase } from "@/lib/config";

export const maxDuration = 120;

function parseUploadUrlFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const pick = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const direct =
    pick(o.url) ?? pick(o.mediaUrl) ?? pick(o.publicUrl) ?? pick(o.fileUrl);
  if (direct) return direct;
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    return pick(d.url) ?? pick(d.mediaUrl) ?? pick(d.publicUrl);
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.trim()) {
    return NextResponse.json({ error: "Missing Authorization" }, { status: 401 });
  }
  const authorization = authHeader.trim();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const entry = form.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "Expected multipart field `file`" }, { status: 400 });
  }
  const videoFile = entry;

  const fullUploadUrl = process.env.CMS_VIDEO_UPLOAD_URL?.trim();
  const uploadPath = process.env.CMS_VIDEO_UPLOAD_PATH?.trim();
  const fieldName = process.env.CMS_VIDEO_UPLOAD_FIELD?.trim() || "file";

  async function forwardToBackend(target: string): Promise<NextResponse> {
    const outgoing = new FormData();
    outgoing.append(fieldName, videoFile, videoFile.name);
    const fr = await fetch(target, {
      method: "POST",
      headers: { Authorization: authorization },
      body: outgoing,
    });
    const jb: unknown = await fr.json().catch(() => null);
    const url = parseUploadUrlFromBody(jb);
    if (!fr.ok) {
      return NextResponse.json(
        { error: extractMessage(jb, "Remote upload failed") },
        {
          status:
            fr.status >= 400 && fr.status < 600 ? fr.status : 502,
        },
      );
    }
    if (!url) {
      return NextResponse.json(
        {
          error:
            "Upload succeeded but the server response did not include a URL. Expected `url`, `mediaUrl`, or `data.url`.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ url });
  }

  if (fullUploadUrl) {
    return forwardToBackend(fullUploadUrl);
  }

  if (uploadPath) {
    const base = getApiBase().replace(/\/$/, "");
    const path = uploadPath.startsWith("/") ? uploadPath : `/${uploadPath}`;
    return forwardToBackend(`${base}${path}`);
  }

  const blobToken = getBlobReadWriteToken();
  if (!blobToken) {
    return NextResponse.json(
      { error: videoUploadNotConfiguredMessage() },
      { status: 503 },
    );
  }

  try {
    const safeName = videoFile.name.replace(/[^\w.-]+/g, "_") || "video";
    const blob = await put(`testimonials/${Date.now()}-${safeName}`, videoFile, {
      access: "public",
      token: blobToken,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Blob upload failed" },
      { status: 500 },
    );
  }
}
