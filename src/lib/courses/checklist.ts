import { lessonMissing } from "./lessons";
import type { CourseWithCurriculum } from "./types";

export type ChecklistItem = {
  key: string;
  label: string;
  /** Plain-language detail of what's missing. */
  detail?: string;
  done: boolean;
  required: boolean;
  step: string;
};

/** Everything the Owner must see before publishing (blueprint §8 publish checklist). */
export function publishChecklist(course: CourseWithCurriculum): ChecklistItem[] {
  const lessons = course.sections.flatMap((s) => s.lessons);
  const published = lessons.filter((l) => l.status === "published");
  const videoLessons = published.filter((l) => l.type === "video");
  const unprocessed = videoLessons.filter((l) => l.video_status !== "ready");
  const incomplete = published.filter((l) => l.type !== "video" && lessonMissing(l));

  const overviewMissing = [
    !course.title && "title",
    !course.subtitle && "short description",
    !(course.description && course.description.length >= 50) && "full description (at least 50 characters)",
    !course.category_id && "category",
  ].filter(Boolean) as string[];

  const seoMissing = [!course.seo_title && "search title", !course.seo_description && "search description"].filter(Boolean) as string[];

  return [
    {
      key: "overview",
      label: "Course overview completed",
      detail: overviewMissing.length ? `Missing: ${overviewMissing.join(", ")}.` : undefined,
      done: overviewMissing.length === 0,
      required: true,
      step: "overview",
    },
    {
      key: "thumbnail",
      label: "Course image uploaded",
      done: Boolean(course.thumbnail_path),
      required: true,
      step: "overview",
    },
    {
      key: "outcomes",
      label: "Learning outcomes added",
      detail: course.outcomes.length < 3 ? `${course.outcomes.length} of 3 added.` : undefined,
      done: course.outcomes.length >= 3,
      required: true,
      step: "outcomes",
    },
    {
      key: "structure",
      label: "At least one section and one published lesson",
      detail:
        course.sections.length === 0
          ? "Add a section."
          : published.length === 0
            ? lessons.length === 0
              ? "Add a lesson."
              : `${lessons.length} lesson${lessons.length === 1 ? " is" : "s are"} still in draft.`
            : undefined,
      done: course.sections.length > 0 && published.length > 0,
      required: true,
      step: "curriculum",
    },
    {
      key: "videos",
      label: "All required videos processed",
      detail: unprocessed.length
        ? `Waiting on: ${unprocessed.slice(0, 3).map((l) => `“${l.title}”`).join(", ")}${unprocessed.length > 3 ? ` and ${unprocessed.length - 3} more` : ""}.`
        : undefined,
      done: unprocessed.length === 0,
      required: true,
      step: "curriculum",
    },
    {
      key: "content",
      label: "Published lessons have their content",
      detail: incomplete.length
        ? incomplete.slice(0, 3).map((l) => `“${l.title}”: ${lessonMissing(l)?.toLowerCase()}`).join("; ") + "."
        : undefined,
      done: incomplete.length === 0,
      required: true,
      step: "curriculum",
    },
    {
      key: "price",
      label: "Pricing configured",
      done: course.price_lkr !== null,
      required: true,
      step: "pricing",
    },
    {
      key: "seo",
      label: "SEO information completed",
      detail: seoMissing.length ? `Missing: ${seoMissing.join(" and ")}.` : undefined,
      done: seoMissing.length === 0,
      required: true,
      step: "seo",
    },
    {
      key: "preview_checked",
      label: "Learner preview checked",
      detail: course.preview_checked_at ? undefined : "Open the learner preview, then confirm below.",
      done: Boolean(course.preview_checked_at),
      required: true,
      step: "publish",
    },
    {
      key: "intro_video",
      label: "Course intro video",
      detail: course.intro_video_status === "processing" ? "Still processing." : "Recommended: a short free trailer on the course page.",
      done: course.intro_video_status === "ready",
      required: false,
      step: "overview",
    },
    {
      key: "free_preview",
      label: "At least one free preview lesson",
      detail: "Recommended: previews help learners decide to buy.",
      done: published.some((l) => l.is_preview && (l.type === "video" || l.type === "text")),
      required: false,
      step: "curriculum",
    },
  ];
}

export function isReadyToPublish(items: ChecklistItem[]) {
  return items.every((i) => i.done || !i.required);
}
