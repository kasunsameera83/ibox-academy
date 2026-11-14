"use server";

import { revalidatePath } from "next/cache";
import { createVideo, deleteVideo, getVideoState, isBunnyConfigured, tusUploadCredentials } from "@/lib/bunny";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";

type LessonRow = { id: string; course_id: string; title: string; bunny_video_id: string | null };

async function loadLesson(lessonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, course_id, title, bunny_video_id")
    .eq("id", lessonId)
    .maybeSingle();
  return { supabase, lesson: data as LessonRow | null };
}

export type UploadTicket =
  | { ok: true; endpoint: string; libraryId: string; videoId: string; expires: number; signature: string }
  | { ok: false; error: string };

/** Creates a Bunny video for the lesson and returns short-lived TUS credentials. */
export async function prepareVideoUploadAction(lessonId: string): Promise<UploadTicket> {
  const user = await requirePermission("courses.upload");
  if (!isBunnyConfigured()) return { ok: false, error: "Video hosting isn't set up yet. Add the Bunny keys to .env.local." };
  const { supabase, lesson } = await loadLesson(lessonId);
  if (!lesson) return { ok: false, error: "Lesson not found." };

  try {
    const previous = lesson.bunny_video_id;
    const videoId = await createVideo(lesson.title);
    const { error } = await supabase
      .from("lessons")
      .update({ bunny_video_id: videoId, video_status: "uploading", duration_seconds: 0 })
      .eq("id", lessonId);
    if (error) {
      await deleteVideo(videoId).catch(() => undefined);
      return { ok: false, error: "The lesson couldn't be updated." };
    }
    if (previous) await deleteVideo(previous).catch(() => undefined);
    await recordAudit(supabase, user.id, "lesson.video_upload_started", { type: "lesson", id: lessonId });
    return { ok: true, ...tusUploadCredentials(videoId) };
  } catch {
    return { ok: false, error: "Couldn't start the upload. Check the Bunny settings and try again." };
  }
}

export async function markVideoUploadedAction(lessonId: string): Promise<{ ok: boolean }> {
  await requirePermission("courses.upload");
  const { supabase, lesson } = await loadLesson(lessonId);
  if (!lesson) return { ok: false };
  await supabase.from("lessons").update({ video_status: "processing" }).eq("id", lessonId);
  revalidatePath(`/app/owner/courses/${lesson.course_id}`);
  return { ok: true };
}

export async function markVideoFailedAction(lessonId: string): Promise<{ ok: boolean }> {
  await requirePermission("courses.upload");
  const { supabase, lesson } = await loadLesson(lessonId);
  if (!lesson) return { ok: false };
  await supabase.from("lessons").update({ video_status: "failed" }).eq("id", lessonId);
  revalidatePath(`/app/owner/courses/${lesson.course_id}`);
  return { ok: true };
}

/** Asks Bunny whether encoding has finished and stores the result. */
export async function refreshVideoStatusAction(
  lessonId: string,
): Promise<{ ok: boolean; status?: "processing" | "ready" | "failed" }> {
  await requirePermission("courses.read");
  const { supabase, lesson } = await loadLesson(lessonId);
  if (!lesson?.bunny_video_id || !isBunnyConfigured()) return { ok: false };
  try {
    const state = await getVideoState(lesson.bunny_video_id);
    await supabase
      .from("lessons")
      .update({ video_status: state.state, duration_seconds: state.durationSeconds })
      .eq("id", lessonId);
    if (state.state !== "processing") revalidatePath(`/app/owner/courses/${lesson.course_id}`);
    return { ok: true, status: state.state };
  } catch {
    return { ok: false };
  }
}
