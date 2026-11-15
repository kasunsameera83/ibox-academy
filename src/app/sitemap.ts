import type { MetadataRoute } from "next";
import { brand } from "@/brand";
import { PAGE_DEFS } from "@/lib/cms/pages";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

/** Home, published info pages and every published course. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = brand.url.replace(/\/$/, "");
  const supabase = createPublicClient();
  const [{ data: courses }, { data: pages }] = await Promise.all([
    supabase.from("courses").select("slug, updated_at").eq("status", "published").limit(5000),
    supabase.from("cms_pages").select("slug, published_at"),
  ]);
  const published = new Map(((pages ?? []) as { slug: string; published_at: string | null }[]).map((p) => [p.slug, p.published_at]));

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/courses`, changeFrequency: "daily", priority: 0.9 },
  ];
  for (const def of Object.values(PAGE_DEFS)) {
    if (def.slug === "home" || !published.has(def.slug)) continue;
    entries.push({ url: `${base}${def.path}`, lastModified: published.get(def.slug) ?? undefined, changeFrequency: "monthly", priority: 0.5 });
  }
  for (const c of (courses ?? []) as { slug: string; updated_at: string }[]) {
    entries.push({ url: `${base}/courses/${c.slug}`, lastModified: c.updated_at, changeFrequency: "weekly", priority: 0.8 });
  }
  return entries;
}
