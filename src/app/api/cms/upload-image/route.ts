import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  getBlobReadWriteToken,
  imageUploadNotConfiguredMessage,
} from "@/lib/cms-upload-env";
import { extractMessage } from "@/lib/content-api";
import { getApiBase } from "@/lib/config";

export const maxDuration = 30;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

/** Mirrors the backend's POST /api/content/uploads/images limit. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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

function sanitizeFolder(input: unknown): string {
  if (typeof input !== "string") return "images";
  const cleaned = input
    .replace(/[^\w\-/]/g, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
  return cleaned || "images";
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
  const imageFile = entry;
  if (imageFile.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (imageFile.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image exceeds the 10 MB size limit." },
      { status: 400 },
    );
  }
  if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
    return NextResponse.json(
      {
        error: `Unsupported image type: ${imageFile.type || "unknown"}. Allowed: jpeg, png, webp, gif, avif, svg.`,
      },
      { status: 415 },
    );
  }

  const folder = sanitizeFolder(form.get("folder"));

  const fullUploadUrl = process.env.CMS_IMAGE_UPLOAD_URL?.trim();
  const uploadPath = process.env.CMS_IMAGE_UPLOAD_PATH?.trim();
  const fieldName = process.env.CMS_IMAGE_UPLOAD_FIELD?.trim() || "file";

  async function forwardToBackend(target: string): Promise<NextResponse> {
    const outgoing = new FormData();
    outgoing.append(fieldName, imageFile, imageFile.name);
    outgoing.append("folder", folder);
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
          status: fr.status >= 400 && fr.status < 600 ? fr.status : 502,
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
      { error: imageUploadNotConfiguredMessage() },
      { status: 503 },
    );
  }

  try {
    const safeName = imageFile.name.replace(/[^\w.-]+/g, "_") || "image";
    const blob = await put(`${folder}/${Date.now()}-${safeName}`, imageFile, {
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
