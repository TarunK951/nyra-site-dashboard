/**
 * Vercel Blob read-write token for `/api/cms/upload-image` and `/api/cms/upload-video`.
 * Checks several names so deployments work when the value is duplicated under a custom key.
 */
export function getBlobReadWriteToken(): string | undefined {
  const keys = [
    "BLOB_READ_WRITE_TOKEN",
    "VERCEL_BLOB_READ_WRITE_TOKEN",
    "CMS_BLOB_READ_WRITE_TOKEN",
  ] as const;
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

function uploadNotConfiguredSuffix(kind: "Image" | "Video"): string {
  const cmsKeys =
    kind === "Image"
      ? "CMS_IMAGE_UPLOAD_URL or CMS_IMAGE_UPLOAD_PATH"
      : "CMS_VIDEO_UPLOAD_URL or CMS_VIDEO_UPLOAD_PATH";
  const base = `${kind} upload is not configured. Set ${cmsKeys} (Nyra API or other backend that returns JSON with a \`url\` field), or set BLOB_READ_WRITE_TOKEN for Vercel Blob.`;
  if (process.env.VERCEL) {
    return (
      `${base} ` +
      "On Vercel, variables from your machine’s .env.local are not used unless you add them in the project: " +
      "Dashboard → your project → Settings → Environment Variables → ensure Production (and Preview if needed) includes the same keys as local. " +
      "For Blob: Storage → Blob → create or connect a store to this project (often adds BLOB_READ_WRITE_TOKEN automatically), or paste the read-write token manually."
    );
  }
  return `${base} Configure the same environment variables on this host as you use locally.`;
}

export function imageUploadNotConfiguredMessage(): string {
  return uploadNotConfiguredSuffix("Image");
}

export function videoUploadNotConfiguredMessage(): string {
  return uploadNotConfiguredSuffix("Video");
}
