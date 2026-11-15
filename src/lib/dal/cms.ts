import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_HOME } from "@/lib/cms/defaults";
import { readPageContent, type PageContent } from "@/lib/cms/schema";

export type MediaAsset = {
  id: string;
  storage_path: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  mime_type: string;
  size_bytes: number;
  file_name: string | null;
  created_at: string;
};

export function siteMediaUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/site-media/${path}`;
}

const MEDIA_COLUMNS = "id, storage_path, alt, width, height, mime_type, size_bytes, file_name, created_at";
type MediaRow = Omit<MediaAsset, "url">;
const withUrl = (m: MediaRow): MediaAsset => ({ ...m, url: siteMediaUrl(m.storage_path) });

/** The live (published) content of a page, or null if it was never published. */
export const getPublishedPage = cache(async (slug: string): Promise<PageContent | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("cms_pages").select("published").eq("slug", slug).maybeSingle();
  return readPageContent((data as { published: unknown } | null)?.published);
});

/** Homepage content: what's published, or the original design until the first publish. */
export async function getHomeContent(): Promise<PageContent> {
  return (await getPublishedPage("home")) ?? DEFAULT_HOME;
}

export async function getMediaMap(ids: string[]): Promise<Map<string, MediaAsset>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("media_assets").select(MEDIA_COLUMNS).in("id", ids);
  return new Map(((data ?? []) as MediaRow[]).map((m) => [m.id, withUrl(m)]));
}

// ---------------------------------------------------------------- editor

export type PageVersion = { id: string; versionNo: number; note: string | null; publishedAt: string; publishedBy: string | null };

export type EditorPage = {
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  draft: PageContent;
  published: PageContent | null;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  draftUpdatedBy: string | null;
  publishedBy: string | null;
  hasUnpublishedChanges: boolean;
  versions: PageVersion[];
};

/** Draft and published copies for the editor. A page never saved starts from its default. */
export async function getPageForEditor(slug: string, fallback: PageContent, title: string): Promise<EditorPage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cms_page_for_editor", { p_slug: slug });
  if (error) throw new Error("cms_page_for_editor failed");
  if (!data) {
    return {
      slug, title, status: "draft", draft: fallback, published: null, draftUpdatedAt: null, publishedAt: null,
      draftUpdatedBy: null, publishedBy: null, hasUnpublishedChanges: true, versions: [],
    };
  }
  const d = data as Record<string, unknown>;
  return {
    slug,
    title: String(d.title ?? title),
    status: d.status as EditorPage["status"],
    draft: readPageContent(d.draft) ?? fallback,
    published: readPageContent(d.published),
    draftUpdatedAt: (d.draftUpdatedAt as string | null) ?? null,
    publishedAt: (d.publishedAt as string | null) ?? null,
    draftUpdatedBy: (d.draftUpdatedBy as string | null) ?? null,
    publishedBy: (d.publishedBy as string | null) ?? null,
    hasUnpublishedChanges: Boolean(d.hasUnpublishedChanges),
    versions: Array.isArray(d.versions) ? (d.versions as PageVersion[]) : [],
  };
}

export async function listMedia(): Promise<MediaAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("media_assets").select(MEDIA_COLUMNS).order("created_at", { ascending: false }).limit(200);
  return ((data ?? []) as MediaRow[]).map(withUrl);
}

export type CourseOption = { id: string; title: string };

export async function listCourseOptions(): Promise<CourseOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id, title").eq("status", "published").order("title").limit(200);
  return (data ?? []) as CourseOption[];
}
