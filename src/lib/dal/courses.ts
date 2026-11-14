import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category, Course, CourseLevel, CourseWithCurriculum, Lesson, Section } from "@/lib/courses/types";

const COURSE_COLUMNS =
  "id, slug, title, subtitle, description, category_id, level, language, outcomes, audience, prerequisites, thumbnail_path, price_lkr, sale_price_lkr, access_type, access_days, status, published_at, seo_title, seo_description, created_at, updated_at";

const LESSON_COLUMNS =
  "id, course_id, section_id, title, description, position, is_preview, bunny_video_id, video_status, duration_seconds";

type RawCourse = Course & {
  category: CourseWithCurriculum["category"];
  sections: (Omit<Section, "lessons"> & { lessons: Lesson[] })[];
};

function normalise(raw: RawCourse): CourseWithCurriculum {
  const sections = [...(raw.sections ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ ...s, lessons: [...(s.lessons ?? [])].sort((a, b) => a.position - b.position) }));
  return {
    ...raw,
    price_lkr: raw.price_lkr === null ? null : Number(raw.price_lkr),
    sale_price_lkr: raw.sale_price_lkr === null ? null : Number(raw.sale_price_lkr),
    sections,
  };
}

const CURRICULUM_SELECT = `${COURSE_COLUMNS}, category:categories(id, name, slug), sections:course_sections(id, course_id, title, position, lessons(${LESSON_COLUMNS}))`;

// ---------------------------------------------------------------- categories

export const listCategories = cache(async (opts: { visibleOnly?: boolean } = {}): Promise<Category[]> => {
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select("id, slug, name, description, parent_id, image_path, sort_order, is_visible")
    .order("sort_order")
    .order("name");
  if (opts.visibleOnly) query = query.eq("is_visible", true);
  const { data } = await query;
  return (data ?? []) as Category[];
});

export async function getCategory(id: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, description, parent_id, image_path, sort_order, is_visible")
    .eq("id", id)
    .maybeSingle();
  return (data as Category | null) ?? null;
}

export async function categoryCourseCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("category_id");
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { category_id: string | null }[]) {
    if (row.category_id) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------- owner / content team

export type CourseListItem = Pick<
  Course,
  "id" | "slug" | "title" | "status" | "price_lkr" | "sale_price_lkr" | "thumbnail_path" | "updated_at"
> & { category: { name: string } | null; lesson_count: number };

export async function listCoursesForTeam(filters: { status?: string; q?: string } = {}): Promise<CourseListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("id, slug, title, status, price_lkr, sale_price_lkr, thumbnail_path, updated_at, category:categories(name), lessons(count)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("title", `%${sanitizeSearch(filters.q)}%`);
  const { data } = await query;
  return ((data ?? []) as (Omit<CourseListItem, "lesson_count"> & { lessons: { count: number }[] })[]).map((c) => ({
    ...c,
    price_lkr: c.price_lkr === null ? null : Number(c.price_lkr),
    sale_price_lkr: c.sale_price_lkr === null ? null : Number(c.sale_price_lkr),
    lesson_count: c.lessons?.[0]?.count ?? 0,
  }));
}

/** Full course for the editor (RLS lets the content team read drafts). */
export async function getCourseForEditor(id: string): Promise<CourseWithCurriculum | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(CURRICULUM_SELECT).eq("id", id).maybeSingle();
  return data ? normalise(data as unknown as RawCourse) : null;
}

// ---------------------------------------------------------------- public

export type CatalogueFilters = {
  q?: string;
  category?: string;
  level?: CourseLevel;
  sort?: "newest" | "price_asc" | "price_desc" | "title";
};

export type CatalogueCourse = Pick<
  Course,
  "id" | "slug" | "title" | "subtitle" | "level" | "language" | "thumbnail_path" | "price_lkr" | "sale_price_lkr" | "access_type" | "access_days" | "published_at"
> & {
  category: { name: string; slug: string } | null;
  lesson_count: number;
  total_seconds: number;
};

export function sanitizeSearch(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listPublishedCourses(filters: CatalogueFilters = {}, limit = 60): Promise<CatalogueCourse[]> {
  const supabase = await createClient();
  // An inner join on category is only needed when filtering by category.
  const categoryJoin = filters.category ? "category:categories!inner(name, slug)" : "category:categories(name, slug)";
  let query = supabase
    .from("courses")
    .select(
      `id, slug, title, subtitle, level, language, thumbnail_path, price_lkr, sale_price_lkr, access_type, access_days, published_at, ${categoryJoin}, lessons(duration_seconds)`,
    )
    .eq("status", "published")
    .limit(limit);

  if (filters.category) query = query.eq("category.slug", filters.category);

  const q = filters.q ? sanitizeSearch(filters.q) : "";
  if (q) query = query.or(`title.ilike."%${q}%",subtitle.ilike."%${q}%"`);
  if (filters.level) query = query.eq("level", filters.level);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price_lkr", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price_lkr", { ascending: false, nullsFirst: false });
      break;
    case "title":
      query = query.order("title");
      break;
    default:
      query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data } = await query;
  type Row = Omit<CatalogueCourse, "lesson_count" | "total_seconds"> & { lessons: { duration_seconds: number }[] };
  return ((data ?? []) as unknown as Row[]).map(({ lessons, ...c }) => ({
    ...c,
    price_lkr: c.price_lkr === null ? null : Number(c.price_lkr),
    sale_price_lkr: c.sale_price_lkr === null ? null : Number(c.sale_price_lkr),
    lesson_count: lessons?.length ?? 0,
    total_seconds: (lessons ?? []).reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0),
  }));
}

/**
 * Course by slug. Returns published courses for everyone; drafts only for
 * the content team (RLS decides), flagged with isPreviewOnly.
 */
export const getCourseBySlug = cache(async (slug: string): Promise<CourseWithCurriculum | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(CURRICULUM_SELECT).eq("slug", slug).maybeSingle();
  return data ? normalise(data as unknown as RawCourse) : null;
});
