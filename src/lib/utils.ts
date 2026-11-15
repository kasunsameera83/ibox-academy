import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Only same-site paths are allowed after sign-in. Browsers ignore tabs and
 * new lines inside URLs and treat "\\" like "/", so "/<tab>/evil.com" or
 * "/\\evil.com" could become an off-site link. Reject those characters, then
 * resolve against a dummy origin and keep the result only if it stays there.
 */
export function safeNextPath(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string" || value.length > 2000) return fallback;
  // Control characters, spaces and backslashes are never needed in our paths.
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const base = "https://same-site.invalid";
    const url = new URL(value, base);
    const path = `${url.pathname}${url.search}${url.hash}`;
    // Resolving "/..//x" gives "//x", which is off-site again.
    if (url.origin !== base || path.startsWith("//")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Next.js page searchParams shape. */
export type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** First value of a search param, or undefined. */
export function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
