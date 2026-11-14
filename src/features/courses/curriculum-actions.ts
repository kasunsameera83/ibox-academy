"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal/session";
import { LESSON_TYPES } from "@/lib/courses/lessons";
import type { LessonStatus, LessonType } from "@/lib/courses/types";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(title: unknown, max: number) {
  return typeof title === "string" ? title.trim().slice(0, max) : "";
}

function touch(courseId: string) {
  revalidatePath(`/app/owner/courses/${courseId}`);
}

export async function addSectionAction(courseId: string, title: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const name = clean(title, 120);
  if (!name) return fail("Enter a section title.");
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("course_sections")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("course_sections")
    .insert({ course_id: courseId, title: name, position: ((last as { position: number } | null)?.position ?? -1) + 1 });
  if (error) return fail("The section couldn't be added.");
  touch(courseId);
  return { ok: true };
}

export async function renameSectionAction(courseId: string, sectionId: string, title: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const name = clean(title, 120);
  if (!name) return fail("Enter a section title.");
  const supabase = await createClient();
  const { error } = await supabase.from("course_sections").update({ title: name }).eq("id", sectionId).eq("course_id", courseId);
  if (error) return fail("The section couldn't be renamed.");
  touch(courseId);
  return { ok: true };
}

export async function deleteSectionAction(courseId: string, sectionId: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("section_id", sectionId);
  if ((count ?? 0) > 0) return fail("Move or delete this section's lessons first.");
  const { error } = await supabase.from("course_sections").delete().eq("id", sectionId).eq("course_id", courseId);
  if (error) return fail("The section couldn't be deleted.");
  touch(courseId);
  return { ok: true };
}

export async function setSectionLessonsStatusAction(courseId: string, sectionId: string, status: LessonStatus): Promise<ActionResult> {
  await requirePermission("courses.edit");
  if (status !== "draft" && status !== "published") return fail("Invalid status.");
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update({ status }).eq("section_id", sectionId).eq("course_id", courseId);
  if (error) return fail("The lessons couldn't be updated.");
  touch(courseId);
  return { ok: true };
}

export async function addLessonAction(courseId: string, sectionId: string, title: string, type: LessonType): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const name = clean(title, 160);
  if (!name) return fail("Enter a lesson title.");
  if (!(type in LESSON_TYPES)) return fail("Choose a lesson type.");
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const settings = type === "quiz" ? { passPercent: 70 } : type === "assignment" ? { submission: ["text", "file"], maxFileMb: 20 } : {};
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      section_id: sectionId,
      title: name,
      type,
      settings,
      position: ((last as { position: number } | null)?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !data) return fail("The lesson couldn't be added.");
  touch(courseId);
  return { ok: true, id: data.id };
}

export async function setLessonStatusAction(courseId: string, lessonId: string, status: LessonStatus): Promise<ActionResult> {
  await requirePermission("courses.edit");
  if (status !== "draft" && status !== "published") return fail("Invalid status.");
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update({ status }).eq("id", lessonId).eq("course_id", courseId);
  if (error) return fail("The lesson couldn't be updated.");
  touch(courseId);
  return { ok: true };
}

export async function setLessonPreviewAction(courseId: string, lessonId: string, isPreview: boolean): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("type").eq("id", lessonId).maybeSingle();
  const type = (lesson as { type: LessonType } | null)?.type;
  if (isPreview && type && !LESSON_TYPES[type].previewable) return fail("Only video and text lessons can be free previews.");
  const { error } = await supabase.from("lessons").update({ is_preview: isPreview }).eq("id", lessonId).eq("course_id", courseId);
  if (error) return fail("The lesson couldn't be updated.");
  touch(courseId);
  return { ok: true };
}

/** Saves a drag-and-drop layout in one transaction. */
export async function reorderCurriculumAction(
  courseId: string,
  layout: { id: string; lessons: string[] }[],
): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const valid =
    Array.isArray(layout) &&
    layout.length <= 200 &&
    layout.every((s) => UUID.test(s.id) && Array.isArray(s.lessons) && s.lessons.length <= 500 && s.lessons.every((l) => UUID.test(l)));
  if (!valid) return fail("The new order couldn't be read.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_curriculum", { p_course_id: courseId, p_layout: layout });
  if (error) return fail("The new order couldn't be saved. Refresh and try again.");
  touch(courseId);
  return { ok: true };
}

export async function deleteLessonAction(courseId: string, lessonId: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const supabase = await createClient();
  const [{ data: lesson }, { data: resources }] = await Promise.all([
    supabase.from("lessons").select("bunny_video_id").eq("id", lessonId).maybeSingle(),
    supabase.from("lesson_resources").select("storage_path").eq("lesson_id", lessonId),
  ]);
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId).eq("course_id", courseId);
  if (error) return fail("The lesson couldn't be deleted.");

  const paths = ((resources ?? []) as { storage_path: string }[]).map((r) => r.storage_path);
  if (paths.length) await supabase.storage.from("lesson-resources").remove(paths);
  const videoId = (lesson as { bunny_video_id: string | null } | null)?.bunny_video_id;
  if (videoId) {
    const { deleteVideo, isBunnyConfigured } = await import("@/lib/bunny");
    if (isBunnyConfigured()) await deleteVideo(videoId).catch(() => undefined);
  }
  touch(courseId);
  return { ok: true };
}
