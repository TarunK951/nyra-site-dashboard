import { extractMessage } from "@/lib/content-api";

/**
 * Uploads a video through the dashboard Next.js route, which stores the file
 * (Vercel Blob or your CMS backend) and returns a public HTTPS URL for `mediaUrl`.
 */
export async function uploadTestimonialVideoToCloud(
  token: string,
  file: File,
  signal?: AbortSignal,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/cms/upload-video", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal,
  });

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = extractMessage(body, "Video upload failed");
    throw new Error(msg);
  }
  if (!body || typeof body !== "object") {
    throw new Error("Unexpected response from upload");
  }
  const url = (body as Record<string, unknown>).url;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Upload did not return a URL");
  }
  return { url: url.trim() };
}
