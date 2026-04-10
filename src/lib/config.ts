/** Public env; exposed to the browser for client-side API calls. */
export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.replace(/\/$/, "");
  }
  // Default production API host; set NEXT_PUBLIC_API_BASE_URL to override (e.g. local backend).
  return "https://server.nyraai.io";
}
