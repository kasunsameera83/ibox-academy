import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CourseWithCurriculum, Lesson, QuizOption } from "@/lib/courses/types";
import { getCourseBySlug, getLessonBody } from "./courses";
import { hasPermission, type SessionUser } from "./session";

export type CourseProgress = { done: number; total: number; percent: number; certificate: string | null };

export type LearnerCourse = {
  course: CourseWithCurriculum;
  lessons: Lesson[];
  /** "enrolled" saves progress; "team" can look around without saving anything. */
  mode: "enrolled" | "team";
  completed: Set<string>;
  lastViewedLessonId: string | null;
  progress: CourseProgress;
};

function percentOf(done: number, total: number) {
  return total === 0 ? 0 : Math.min(100, Math.floor((done * 100) / total));
}

/** The course as the player sees it, or null when the user has no access. */
export async function getLearnerCourse(slug: string, user: SessionUser): Promise<LearnerCourse | null> {
  const course = await getCourseBySlug(slug);
  if (!course) return null;

  const supabase = await createClient();
  const { data: enrolment } = await supabase
    .from("enrolments")
    .select("status, expires_at")
    .eq("student_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();
  const e = enrolment as { status: string; expires_at: string | null } | null;
  const enrolled = Boolean(e && e.status === "active" && (!e.expires_at || new Date(e.expires_at) > new Date()));
  const isTeam = hasPermission(user, "courses.read");
  if (!enrolled && !isTeam) return null;

  const lessons = course.sections.flatMap((s) => s.lessons);
  const [{ data: progressRows }, { data: certificate }] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at, last_viewed_at")
      .eq("student_id", user.id)
      .eq("course_id", course.id)
      .order("last_viewed_at", { ascending: false }),
    supabase.from("certificates").select("code").eq("student_id", user.id).eq("course_id", course.id).maybeSingle(),
  ]);
  const rows = (progressRows ?? []) as { lesson_id: string; completed_at: string | null }[];
  const lessonIds = new Set(lessons.map((l) => l.id));
  const completed = new Set(rows.filter((r) => r.completed_at && lessonIds.has(r.lesson_id)).map((r) => r.lesson_id));
  const lastViewed = rows.find((r) => lessonIds.has(r.lesson_id))?.lesson_id ?? null;

  return {
    course,
    lessons,
    mode: enrolled ? "enrolled" : "team",
    completed,
    lastViewedLessonId: lastViewed,
    progress: {
      done: completed.size,
      total: lessons.length,
      percent: percentOf(completed.size, lessons.length),
      certificate: (certificate as { code: string } | null)?.code ?? null,
    },
  };
}

/** Where "Continue" should take the learner. */
export function resumeLessonId(data: LearnerCourse): string | null {
  const { lessons, completed, lastViewedLessonId } = data;
  if (lastViewedLessonId) {
    if (!completed.has(lastViewedLessonId)) return lastViewedLessonId;
    // Last lesson is done: go to the next unfinished one after it.
    const from = lessons.findIndex((l) => l.id === lastViewedLessonId);
    const next = lessons.slice(from + 1).find((l) => !completed.has(l.id));
    if (next) return next.id;
  }
  return (lessons.find((l) => !completed.has(l.id)) ?? lessons[0])?.id ?? null;
}

// ---------------------------------------------------------------- lesson content

export type LearnerQuestion = { id: string; prompt: string; options: QuizOption[] };
export type QuizAttemptSummary = { percent: number; passed: boolean; created_at: string };
export type LearnerResource = { id: string; file_name: string; size_bytes: number; url: string | null };
export type MySubmission = {
  text_answer: string | null;
  file_name: string | null;
  file_url: string | null;
  status: "submitted" | "approved" | "changes_requested";
  feedback: string | null;
  submitted_at: string;
};

export type LessonContent = {
  body: string | null;
  questions: LearnerQuestion[];
  lastAttempt: QuizAttemptSummary | null;
  bestPercent: number | null;
  resources: LearnerResource[];
  submission: MySubmission | null;
};

export async function getLessonContent(lesson: Lesson, user: SessionUser): Promise<LessonContent> {
  const supabase = await createClient();
  const content: LessonContent = { body: null, questions: [], lastAttempt: null, bestPercent: null, resources: [], submission: null };

  const tasks: Promise<void>[] = [];

  if (lesson.type === "text" || lesson.type === "assignment") {
    tasks.push(getLessonBody(lesson.id).then((b) => void (content.body = b)));
  }

  if (lesson.type === "quiz") {
    tasks.push(
      (async () => {
        const [{ data: questions }, { data: attempts }] = await Promise.all([
          supabase.rpc("get_quiz_questions", { p_lesson_id: lesson.id }),
          supabase
            .from("quiz_attempts")
            .select("percent, passed, created_at")
            .eq("student_id", user.id)
            .eq("lesson_id", lesson.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);
        content.questions = ((questions ?? []) as LearnerQuestion[]).map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
        }));
        const list = (attempts ?? []) as QuizAttemptSummary[];
        content.lastAttempt = list[0] ?? null;
        content.bestPercent = list.length ? Math.max(...list.map((a) => a.percent)) : null;
      })(),
    );
  }

  // Any lesson type can carry downloadable files.
  tasks.push(
    (async () => {
      const { data } = await supabase.rpc("get_lesson_resources", { p_lesson_id: lesson.id });
      const rows = (data ?? []) as { id: string; file_name: string; storage_path: string; size_bytes: number }[];
      content.resources = await Promise.all(
        rows.map(async (r) => {
          const { data: signed } = await supabase.storage
            .from("lesson-resources")
            .createSignedUrl(r.storage_path, 60 * 60, { download: r.file_name });
          return { id: r.id, file_name: r.file_name, size_bytes: Number(r.size_bytes), url: signed?.signedUrl ?? null };
        }),
      );
    })(),
  );

  if (lesson.type === "assignment") {
    tasks.push(
      (async () => {
        const { data } = await supabase
          .from("assignment_submissions")
          .select("text_answer, file_name, file_path, status, feedback, submitted_at")
          .eq("student_id", user.id)
          .eq("lesson_id", lesson.id)
          .maybeSingle();
        const row = data as (Omit<MySubmission, "file_url"> & { file_path: string | null }) | null;
        if (!row) return;
        let fileUrl: string | null = null;
        if (row.file_path) {
          const { data: signed } = await supabase.storage
            .from("assignment-submissions")
            .createSignedUrl(row.file_path, 60 * 60, { download: row.file_name ?? true });
          fileUrl = signed?.signedUrl ?? null;
        }
        const { file_path: _ignored, ...rest } = row;
        void _ignored;
        content.submission = { ...rest, file_url: fileUrl };
      })(),
    );
  }

  await Promise.all(tasks);
  return content;
}

/** Remember the lesson as the last one opened (enrolled learners only). */
export async function recordLessonView(lessonId: string) {
  const supabase = await createClient();
  await supabase.rpc("record_lesson_view", { p_lesson_id: lessonId });
}

// ---------------------------------------------------------------- My Learning

export type MyCourseCard = {
  enrolmentId: string;
  status: "active" | "revoked" | "expired";
  expiresAt: string | null;
  active: boolean;
  course: { id: string; slug: string; title: string; subtitle: string | null; thumbnail_path: string | null } | null;
  progress: CourseProgress;
  lastViewedAt: string | null;
};

export async function listMyCourses(userId: string): Promise<MyCourseCard[]> {
  const supabase = await createClient();
  const [{ data: enrolments }, { data: progress }, { data: certificates }] = await Promise.all([
    supabase
      .from("enrolments")
      .select("id, status, expires_at, starts_at, course:courses(id, slug, title, subtitle, thumbnail_path, lessons(id, status))")
      .eq("student_id", userId)
      .order("starts_at", { ascending: false }),
    supabase.from("lesson_progress").select("course_id, lesson_id, completed_at, last_viewed_at").eq("student_id", userId),
    supabase.from("certificates").select("course_id, code").eq("student_id", userId),
  ]);

  type Row = {
    id: string;
    status: MyCourseCard["status"];
    expires_at: string | null;
    course: (NonNullable<MyCourseCard["course"]> & { lessons: { id: string; status: string }[] }) | null;
  };
  const progressRows = (progress ?? []) as { course_id: string; lesson_id: string; completed_at: string | null; last_viewed_at: string }[];
  const certs = new Map(((certificates ?? []) as { course_id: string; code: string }[]).map((c) => [c.course_id, c.code]));

  const cards = ((enrolments ?? []) as unknown as Row[]).map((e): MyCourseCard => {
    const published = new Set((e.course?.lessons ?? []).filter((l) => l.status === "published").map((l) => l.id));
    const mine = progressRows.filter((p) => p.course_id === e.course?.id);
    const done = mine.filter((p) => p.completed_at && published.has(p.lesson_id)).length;
    const lastViewedAt = mine.reduce<string | null>((latest, p) => (!latest || p.last_viewed_at > latest ? p.last_viewed_at : latest), null);
    const expired = e.status === "expired" || (e.expires_at !== null && new Date(e.expires_at) < new Date());
    const { lessons: _lessons, ...course } = e.course ?? { lessons: [] };
    void _lessons;
    return {
      enrolmentId: e.id,
      status: e.status,
      expiresAt: e.expires_at,
      active: e.status === "active" && !expired,
      course: e.course ? (course as MyCourseCard["course"]) : null,
      progress: {
        done,
        total: published.size,
        percent: percentOf(done, published.size),
        certificate: e.course ? certs.get(e.course.id) ?? null : null,
      },
      lastViewedAt,
    };
  });

  // Most recently studied first; untouched courses keep enrolment order.
  return cards.sort((a, b) => (b.lastViewedAt ?? "").localeCompare(a.lastViewedAt ?? ""));
}

export type MyCertificate = { code: string; course_title: string; student_name: string; issued_at: string; course_slug: string | null };

export async function listMyCertificates(userId: string): Promise<MyCertificate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("code, course_title, student_name, issued_at, course:courses(slug)")
    .eq("student_id", userId)
    .order("issued_at", { ascending: false });
  return ((data ?? []) as unknown as (Omit<MyCertificate, "course_slug"> & { course: { slug: string } | null })[]).map(
    ({ course, ...c }) => ({ ...c, course_slug: course?.slug ?? null }),
  );
}

export type VerifiedCertificate = { code: string; student_name: string; course_title: string; course_slug: string; issued_at: string; design: unknown };

export async function verifyCertificate(code: string): Promise<VerifiedCertificate | null> {
  if (!/^[A-Za-z0-9-]{6,20}$/.test(code)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: code });
  const rows = (data ?? []) as VerifiedCertificate[];
  return rows[0] ?? null;
}
