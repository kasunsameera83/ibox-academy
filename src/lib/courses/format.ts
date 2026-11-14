import { brand } from "@/brand";
import type { AccessType, Course } from "./types";

const lkr = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: brand.locale.currency,
  maximumFractionDigits: 0,
});

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (Number(value) === 0) return "Free";
  return lkr.format(Number(value));
}

/** Price a learner pays now (sale price when set). */
export function effectivePrice(course: Pick<Course, "price_lkr" | "sale_price_lkr">): number | null {
  if (course.sale_price_lkr !== null && course.sale_price_lkr !== undefined) return Number(course.sale_price_lkr);
  return course.price_lkr === null ? null : Number(course.price_lkr);
}

export function accessLabel(type: AccessType, days: number | null): string {
  if (type === "lifetime") return "Lifetime access";
  if (!days) return "Limited access";
  if (days % 365 === 0) return `${days / 365} year${days === 365 ? "" : "s"} of access`;
  if (days % 30 === 0) return `${days / 30} month${days === 30 ? "" : "s"} of access`;
  return `${days} days of access`;
}

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${Math.max(minutes, 1)} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

export function formatClock(totalSeconds: number): string {
  if (!totalSeconds) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/course-media/${path}`;
}

export function linesToList(value: unknown, max = 20): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}
