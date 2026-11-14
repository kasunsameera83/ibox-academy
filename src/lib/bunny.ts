import "server-only";
import { createHash } from "node:crypto";

/**
 * Bunny Stream helpers. The API key and token key never leave the server.
 * Docs: TUS signature = SHA256(libraryId + apiKey + expires + videoId)
 *       Embed token   = SHA256_HEX(tokenKey + videoId + expires)
 */
const API_BASE = "https://video.bunnycdn.com";

function config() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!libraryId || !apiKey || !tokenKey) {
    throw new Error("Bunny Stream is not configured. Add the BUNNY_STREAM_* values to .env.local.");
  }
  return { libraryId, apiKey, tokenKey };
}

export function isBunnyConfigured() {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_STREAM_TOKEN_KEY,
  );
}

async function bunnyFetch(path: string, init: RequestInit = {}) {
  const { apiKey } = config();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      AccessKey: apiKey,
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  return res;
}

export async function createVideo(title: string): Promise<string> {
  const { libraryId } = config();
  const res = await bunnyFetch(`/library/${libraryId}/videos`, {
    method: "POST",
    body: JSON.stringify({ title: title.slice(0, 200) }),
  });
  if (!res.ok) throw new Error(`Bunny create video failed (${res.status})`);
  const data = (await res.json()) as { guid?: string };
  if (!data.guid) throw new Error("Bunny did not return a video ID");
  return data.guid;
}

export async function deleteVideo(videoId: string): Promise<void> {
  const { libraryId } = config();
  const res = await bunnyFetch(`/library/${libraryId}/videos/${encodeURIComponent(videoId)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Bunny delete video failed (${res.status})`);
}

export type BunnyVideoState = { state: "processing" | "ready" | "failed"; durationSeconds: number };

/**
 * Bunny status codes: 0 created, 1 uploaded, 2 processing, 3 transcoding/finished,
 * 4 resolution finished, 5 failed, 6–7 presigned upload, 8 upload failed.
 * A video is playable once at least one resolution exists (3 or 4).
 */
export async function getVideoState(videoId: string): Promise<BunnyVideoState> {
  const { libraryId } = config();
  const res = await bunnyFetch(`/library/${libraryId}/videos/${encodeURIComponent(videoId)}`);
  if (!res.ok) throw new Error(`Bunny get video failed (${res.status})`);
  const v = (await res.json()) as { status?: number; length?: number; encodeProgress?: number };
  const status = v.status ?? 0;
  const durationSeconds = Math.round(v.length ?? 0);
  if (status === 5 || status === 8) return { state: "failed", durationSeconds };
  if (status === 3 || status === 4) return { state: "ready", durationSeconds };
  return { state: "processing", durationSeconds };
}

/** Short-lived credentials for a direct browser → Bunny TUS upload. */
export function tusUploadCredentials(videoId: string, ttlSeconds = 60 * 60 * 6) {
  const { libraryId, apiKey } = config();
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHash("sha256").update(`${libraryId}${apiKey}${expires}${videoId}`).digest("hex");
  return { endpoint: `${API_BASE}/tusupload`, libraryId, videoId, expires, signature };
}

/** Signed player URL. Default lifetime is short; the player keeps working once loaded. */
export function signedEmbedUrl(videoId: string, ttlSeconds = 60 * 60 * 2): string {
  const { libraryId, tokenKey } = config();
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = createHash("sha256").update(`${tokenKey}${videoId}${expires}`).digest("hex");
  const params = new URLSearchParams({
    token,
    expires: String(expires),
    autoplay: "false",
    preload: "true",
    responsive: "true",
  });
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${encodeURIComponent(videoId)}?${params}`;
}
