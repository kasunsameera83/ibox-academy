import type { CourseWithCurriculum } from "./types";

export type ChecklistItem = { key: string; label: string; done: boolean; step: string };

/** What must be true before a course can be published (blueprint §8 publish checklist). */
export function publishChecklist(course: CourseWithCurriculum): ChecklistItem[] {
  const lessons = course.sections.flatMap((s) => s.lessons);
  return [
    { key: "title", label: "Title and short description", done: Boolean(course.title && course.subtitle), step: "overview" },
    { key: "description", label: "Full description", done: Boolean(course.description && course.description.length >= 50), step: "overview" },
    { key: "category", label: "Category selected", done: Boolean(course.category_id), step: "overview" },
    { key: "thumbnail", label: "Course image uploaded", done: Boolean(course.thumbnail_path), step: "overview" },
    { key: "outcomes", label: "At least 3 learning outcomes", done: course.outcomes.length >= 3, step: "outcomes" },
    { key: "lessons", label: "At least one lesson", done: lessons.length > 0, step: "curriculum" },
    {
      key: "videos",
      label: "Every lesson has a ready video",
      done: lessons.length > 0 && lessons.every((l) => l.video_status === "ready"),
      step: "curriculum",
    },
    { key: "preview", label: "At least one free preview lesson", done: lessons.some((l) => l.is_preview), step: "curriculum" },
    { key: "price", label: "Price set", done: course.price_lkr !== null, step: "pricing" },
  ];
}
