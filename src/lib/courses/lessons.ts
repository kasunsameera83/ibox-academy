import type { Lesson, LessonType, Section } from "./types";
import { formatClock } from "./format";

export const LESSON_TYPES: Record<
  LessonType,
  { label: string; short: string; description: string; previewable: boolean }
> = {
  video: { label: "Video lesson", short: "Video", description: "Upload a video. Captions and duration are handled for you.", previewable: true },
  text: { label: "Text lesson", short: "Text lesson", description: "Written content with headings and lists.", previewable: true },
  resource: { label: "Downloadable resource", short: "Resource", description: "PDFs, templates, ZIPs and other files.", previewable: false },
  quiz: { label: "Quiz", short: "Quiz", description: "Multiple-choice questions with a pass mark.", previewable: false },
  assignment: { label: "Assignment", short: "Assignment", description: "A task learners submit as text or a file.", previewable: false },
};

export const LESSON_TYPE_ORDER: LessonType[] = ["video", "text", "resource", "quiz", "assignment"];

/** Words per minute used to estimate reading time. */
const WPM = 200;

export function estimateReadingMinutes(body: string | null | undefined): number {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return words === 0 ? 0 : Math.max(1, Math.round(words / WPM));
}

/** Whether a lesson has everything learners need. Drives "Pending" and the publish checklist. */
export function lessonMissing(lesson: Lesson): string | null {
  switch (lesson.type) {
    case "video":
      if (lesson.video_status === "none" || lesson.video_status === "failed") return "Video not uploaded";
      if (lesson.video_status !== "ready") return "Video processing";
      return null;
    case "text":
      return lesson.has_body ? null : "No content yet";
    case "resource":
      return lesson.resource_count > 0 ? null : "No files attached";
    case "quiz":
      return lesson.question_count > 0 ? null : "No questions yet";
    case "assignment":
      return lesson.has_body ? null : "No instructions yet";
  }
}

export type LessonDisplayStatus = { key: "ready" | "draft" | "pending"; label: string };

export function lessonDisplayStatus(lesson: Lesson): LessonDisplayStatus {
  if (lesson.status === "draft") return { key: "draft", label: "Draft" };
  return lessonMissing(lesson) ? { key: "pending", label: "Pending" } : { key: "ready", label: "Ready" };
}

/** One-line summary shown under the lesson title, e.g. "Video · 08:25 · Uploaded". */
export function lessonSummary(lesson: Lesson): string {
  const t = LESSON_TYPES[lesson.type].short;
  switch (lesson.type) {
    case "video": {
      if (lesson.video_status === "ready") return `${t} · ${formatClock(lesson.duration_seconds) || "—"} · Uploaded`;
      if (lesson.video_status === "processing") return `${t} · Processing`;
      if (lesson.video_status === "uploading") return `${t} · Upload in progress`;
      if (lesson.video_status === "failed") return `${t} · Upload failed`;
      return `${t} · Not uploaded`;
    }
    case "text": {
      const minutes = lesson.reading_minutes ?? estimateReadingMinutes(lesson.body);
      return minutes ? `${t} · ${minutes} min read` : `${t} · Empty`;
    }
    case "resource":
      return `${t} · ${lesson.resource_count} file${lesson.resource_count === 1 ? "" : "s"}`;
    case "quiz":
      return `${t} · ${lesson.question_count} question${lesson.question_count === 1 ? "" : "s"}`;
    case "assignment":
      return lesson.has_body ? `${t} · Instructions added` : `${t} · No instructions`;
  }
}

/** Seconds a lesson adds to the course length (videos by duration, text by reading time). */
export function lessonSeconds(lesson: Lesson): number {
  if (lesson.type === "video") return lesson.duration_seconds;
  if (lesson.type === "text") return (lesson.reading_minutes ?? estimateReadingMinutes(lesson.body)) * 60;
  return 0;
}

export function curriculumStats(sections: Section[]) {
  const lessons = sections.flatMap((s) => s.lessons);
  return {
    sectionCount: sections.length,
    lessonCount: lessons.length,
    totalSeconds: lessons.reduce((sum, l) => sum + lessonSeconds(l), 0),
    previewCount: lessons.filter((l) => l.is_preview && LESSON_TYPES[l.type].previewable).length,
  };
}
