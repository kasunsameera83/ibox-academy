"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

function clean(title: unknown, max: number) {
  return typeof title === "string" ? title.trim().slice(0, max) : "";
}

async function touch(courseId: string) {
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
  await touch(courseId);
  return { ok: true };
}

export async function renameSectionAction(courseId: string, sectionId: string, title: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const name = clean(title, 120);
  if (!name) return fail("Enter a section title.");
  const supabase = await createClient();
  const { error } = await supabase.from("course_sections").update({ title: name }).eq("id", sectionId).eq("course_id", courseId);
  if (error) return fail("The section couldn't be renamed.");
  await touch(courseId);
  return { ok: true };
}

export async function deleteSectionAction(courseId: string, sectionId: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("section_id", sectionId);
  if ((count ?? 0) > 0) return fail("Delete or move this section's lessons first.");
  const { error } = await supabase.from("course_sections").delete().eq("id", sectionId).eq("course_id", courseId);
  if (error) return fail("The section couldn't be deleted.");
  await touch(courseId);
  return { ok: true };
}

/** Swaps an item with its neighbour. */
async function move(
  table: "course_sections" | "lessons",
  scope: { column: "course_id" | "section_id"; value: string },
  id: string,
  direction: "up" | "down",
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("id, position").eq(scope.column, scope.value).order("position");
  const rows = (data ?? []) as { id: string; position: number }[];
  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return true;
  // Normalise positions to 0..n then swap.
  const ordered = rows.map((r, i) => ({ ...r, position: i }));
  [ordered[index].position, ordered[swapWith].position] = [ordered[swapWith].position, ordered[index].position];
  const results = await Promise.all(
    ordered.map((r) => supabase.from(table).update({ position: r.position }).eq("id", r.id)),
  );
  return results.every((r) => !r.error);
}

export async function moveSectionAction(courseId: string, sectionId: string, direction: "up" | "down"): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const ok = await move("course_sections", { column: "course_id", value: courseId }, sectionId, direction);
  if (!ok) return fail("The order couldn't be saved.");
  await touch(courseId);
  return { ok: true };
}

export async function addLessonAction(courseId: string, sectionId: string, title: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const name = clean(title, 160);
  if (!name) return fail("Enter a lesson title.");
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("lessons").insert({
    course_id: courseId,
    section_id: sectionId,
    title: name,
    position: ((last as { position: number } | null)?.position ?? -1) + 1,
  });
  if (error) return fail("The lesson couldn't be added.");
  await touch(courseId);
  return { ok: true };
}

export async function updateLessonAction(
  courseId: string,
  lessonId: string,
  changes: { title?: string; description?: string; isPreview?: boolean },
): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const update: Record<string, unknown> = {};
  if (changes.title !== undefined) {
    const name = clean(changes.title, 160);
    if (!name) return fail("Enter a lesson title.");
    update.title = name;
  }
  if (changes.description !== undefined) update.description = clean(changes.description, 5000) || null;
  if (changes.isPreview !== undefined) update.is_preview = Boolean(changes.isPreview);
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update(update).eq("id", lessonId).eq("course_id", courseId);
  if (error) return fail("The lesson couldn't be saved.");
  await touch(courseId);
  return { ok: true };
}

export async function moveLessonAction(courseId: string, sectionId: string, lessonId: string, direction: "up" | "down"): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const ok = await move("lessons", { column: "section_id", value: sectionId }, lessonId, direction);
  if (!ok) return fail("The order couldn't be saved.");
  await touch(courseId);
  return { ok: true };
}

export async function deleteLessonAction(courseId: string, lessonId: string): Promise<ActionResult> {
  await requirePermission("courses.edit");
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("bunny_video_id").eq("id", lessonId).maybeSingle();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId).eq("course_id", courseId);
  if (error) return fail("The lesson couldn't be deleted.");
  const videoId = (lesson as { bunny_video_id: string | null } | null)?.bunny_video_id;
  if (videoId) {
    const { deleteVideo, isBunnyConfigured } = await import("@/lib/bunny");
    if (isBunnyConfigured()) await deleteVideo(videoId).catch(() => undefined);
  }
  await touch(courseId);
  return { ok: true };
}
