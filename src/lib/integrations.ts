import "server-only";
import { isBunnyConfigured } from "@/lib/bunny";

export type IntegrationStatus = {
  key: "video";
  name: string;
  provider: string;
  connected: boolean;
  /** Non-secret details that are safe to show the Owner. */
  details: { label: string; value: string }[];
};

function mask(value: string | undefined) {
  if (!value) return "Not set";
  return value.length <= 8 ? "••••" : `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function videoIntegrationStatus(): IntegrationStatus {
  return {
    key: "video",
    name: "Video hosting",
    provider: "Bunny Stream",
    connected: isBunnyConfigured(),
    details: [
      { label: "Library ID", value: process.env.BUNNY_STREAM_LIBRARY_ID || "Not set" },
      { label: "CDN hostname", value: process.env.BUNNY_STREAM_CDN_HOSTNAME || "Not set" },
      { label: "API key", value: mask(process.env.BUNNY_STREAM_API_KEY) },
      { label: "Token authentication key", value: mask(process.env.BUNNY_STREAM_TOKEN_KEY) },
    ],
  };
}
