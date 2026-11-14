import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  Course,
  CourseLevel,
  CourseWithCurriculum,
  Lesson,
  LessonResource,
  QuizQuestion,
  Section,
} from "@/lib/courses/types";

const COURSE_COLUMNS =
  "id, slug, title, subtitle, description, category_id, level, language, outcomes, audience, prerequisites, thumbnail_path, price_lkr, sale_price_lkr, access_type, access_days, status, published_at, seo_title, seo_description, preview_checked_at, intro_video_id, intro_video_status, intro_duration_seconds, certificate, created_at, updated_at";

const LESSON_COLUMNS =
  "id, course_id, section_id, type, status, title, description, has_body, settings, reading_minutes, position, is_preview, video_status, duration_seconds";

type RawLesson = Omit<Lesson, "resource_count" | "question_count" | "body" | "bunny_video_id"> & {
  body?: string | null;
  lesson_resources?: { count: number }[];
  quiz_questions?: { count: number }[];
};

type RawCourse = Course & {
  category: CourseWithCurriculum["category"];
  sections: (Omit<Section, "lessons"> & { lessons: RawLesson[] })[];
};

function normaliseLesson(raw: RawLesson): Lesson {
  const { lesson_resources, quiz_questions, ...rest } = raw;
  return {
    ...rest,
    // The text itself is loaded separately (lesson_body) by pages that may show it.
    body: rest.body ?? null,
    // Filled in by attachVideoIds() only for lessons the viewer may open.
    bunny_video_id: null,
    settings: (rest.settings ?? {}) as Lesson["settings"],
    resource_count: lesson_resources?.[0]?.count ?? 0,
    question_count: quiz_questions?.[0]?.count ?? 0,
  };
}

function normalise(raw: RawCourse): CourseWithCurriculum {
  const sections = [...(raw.sections ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      ...s,
      lessons: [...(s.lessons ?? [])].sort((a, b) => a.position - b.position).map(normaliseLesson),
    }));
  return {
    ...raw,
    price_lkr: raw.price_lkr === null ? null : Number(raw.price_lkr),
    sale_price_lkr: raw.sale_price_lkr === null ? null : Number(raw.sale_price_lkr),
    sections,
  };
}


type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Bunny video IDs are hidden from direct reads. lesson_video_ids() returns
 * them only for lessons the caller may open (team, enrolled or a free preview).
 */
async function videoIdsFor(supabase: ServerClient, lessonIds: string[]): Promise<Map<string, string>> {
  if (lessonIds.length === 0) return new Map();
  const { data } = await supabase.rpc("lesson_video_ids", { p_lesson_ids: lessonIds });
  return new Map(((data ?? []) as { lesson_id: string; video_id: string }[]).map((r) => [r.lesson_id, r.video_id]));
}

async function attachVideoIds(supabase: ServerClient, course: CourseWithCurriculum): Promise<CourseWithCurriculum> {
  const videoLessons = course.sections.flatMap((s) => s.lessons).filter((l) => l.type === "video");
  const ids = await videoIdsFor(supabase, videoLessons.map((l) => l.id));
  return {
    ...course,
    sections: course.sections.map((s) => ({
      ...s,
      lessons: s.lessons.map((l) => (ids.has(l.id) ? { ...l, bunny_video_id: ids.get(l.id)! } : l)),
    })),
  };
}

/** One lesson's Bunny video ID, or null when there is none or the caller may not open it. */
export async function lessonVideoId(supabase: ServerClient, lessonId: string): Promise<string | null> {
  return (await videoIdsFor(supabase, [lessonId])).get(lessonId) ?? null;
}

/** Public: lesson rows only (RLS hides drafts and unpublished courses). */
const CURRICULUM_SELECT = `${COURSE_COLUMNS}, category:categories(id, name, slug), sections:course_sections(id, course_id, title, position, lessons(${LESSON_COLUMNS}))`;
/** Content team: adds resource and question counts (tables learners can't read). */
const TEAM_CURRICULUM_SELECT = `${COURSE_COLUMNS}, category:categories(id, name, slug), sections:course_sections(id, course_id, title, position, lessons(${LESSON_COLUMNS}, lesson_resources(count), quiz_questions(count)))`;

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
  return ((data ?? []) as unknown as (Omit<CourseListItem, "lesson_count"> & { lessons: { count: number }[] })[]).map((c) => ({
    ...c,
    price_lkr: c.price_lkr === null ? null : Number(c.price_lkr),
    sale_price_lkr: c.sale_price_lkr === null ? null : Number(c.sale_price_lkr),
    lesson_count: c.lessons?.[0]?.count ?? 0,
  }));
}

/** Full course for the editor (RLS lets the content team read drafts). */
export async function getCourseForEditor(id: string): Promise<CourseWithCurriculum | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(TEAM_CURRICULUM_SELECT).eq("id", id).maybeSingle();
  return data ? attachVideoIds(supabase, normalise(data as unknown as RawCourse)) : null;
}

export type LessonEditorData = {
  lesson: Lesson;
  course: Pick<Course, "id" | "title" | "slug" | "status">;
  sections: { id: string; title: string }[];
  resources: LessonResource[];
  questions: QuizQuestion[];
};

export async function getLessonForEditor(courseId: string, lessonId: string): Promise<LessonEditorData | null> {
  const supabase = await createClient();
  const [{ data: lesson }, { data: course }, { data: sections }, { data: resources }, { data: questions }] = await Promise.all([
    supabase.from("lessons").select(LESSON_COLUMNS).eq("id", lessonId).eq("course_id", courseId).maybeSingle(),
    supabase.from("courses").select("id, title, slug, status").eq("id", courseId).maybeSingle(),
    supabase.from("course_sections").select("id, title").eq("course_id", courseId).order("position"),
    supabase.from("lesson_resources").select("id, lesson_id, file_name, storage_path, size_bytes, mime_type, position").eq("lesson_id", lessonId).order("position"),
    supabase.from("quiz_questions").select("id, lesson_id, position, prompt, options, correct_option_id, explanation").eq("lesson_id", lessonId).order("position"),
  ]);
  if (!lesson || !course) return null;
  const resourceList = (resources ?? []) as LessonResource[];
  const questionList = (questions ?? []) as QuizQuestion[];
  // Text bodies are hidden from direct reads; the content team gets them through lesson_body.
  const [{ data: body }, videoId] = await Promise.all([
    supabase.rpc("lesson_body", { p_lesson_id: lessonId }),
    lessonVideoId(supabase, lessonId),
  ]);
  return {
    lesson: {
      ...normaliseLesson(lesson as unknown as RawLesson),
      body: (body as string | null) ?? null,
      bunny_video_id: videoId,
      resource_count: resourceList.length,
      question_count: questionList.length,
    },
    course: course as LessonEditorData["course"],
    sections: (sections ?? []) as { id: string; title: string }[],
    resources: resourceList,
    questions: questionList,
  };
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
      `id, slug, title, subtitle, level, language, thumbnail_path, price_lkr, sale_price_lkr, access_type, access_days, published_at, ${categoryJoin}, lessons(type, duration_seconds, reading_minutes)`,
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
  type Row = Omit<CatalogueCourse, "lesson_count" | "total_seconds"> & {
    lessons: { type: string; duration_seconds: number; reading_minutes: number | null }[];
  };
  return ((data ?? []) as unknown as Row[]).map(({ lessons, ...c }) => ({
    ...c,
    price_lkr: c.price_lkr === null ? null : Number(c.price_lkr),
    sale_price_lkr: c.sale_price_lkr === null ? null : Number(c.sale_price_lkr),
    lesson_count: lessons?.length ?? 0,
    total_seconds: (lessons ?? []).reduce(
      (sum, l) => sum + (l.type === "video" ? l.duration_seconds ?? 0 : l.type === "text" ? (l.reading_minutes ?? 0) * 60 : 0),
      0,
    ),
  }));
}

/**
 * Course by slug. Returns published courses for everyone; drafts only for
 * the content team (RLS decides), flagged with isPreviewOnly.
 */
export const getCourseBySlug = cache(async (slug: string): Promise<CourseWithCurriculum | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(CURRICULUM_SELECT).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const course = await attachVideoIds(supabase, normalise(data as unknown as RawCourse));
  // Learner-facing pages only ever show published lessons, even to the team.
  const sections = course.sections
    .map((s) => ({ ...s, lessons: s.lessons.filter((l) => l.status === "published") }))
    .filter((s) => s.lessons.length > 0);
  return { ...course, sections };
});

/** Lesson text (text lessons and assignment instructions) for anyone allowed to open the lesson. */
export async function getLessonBody(lessonId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lesson_body", { p_lesson_id: lessonId });
  return error ? null : ((data as string | null) ?? null);
}
