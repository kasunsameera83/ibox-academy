"use server";

import { revalidatePath } from "next/cache";
import { createVideo, deleteVideo, getVideoState, isBunnyConfigured, tusUploadCredentials } from "@/lib/bunny";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";
import { lessonVideoId } from "@/lib/dal/courses";
import { revalidateWorkspaces } from "@/lib/workspace";

type LessonRow = { id: string; course_id: string; title: string; type: string; bunny_video_id: string | null };

async function loadLesson(lessonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, course_id, title, type")
    .eq("id", lessonId)
    .maybeSingle();
  if (!data) return { supabase, lesson: null };
  const bunny_video_id = await lessonVideoId(supabase, lessonId);
  return { supabase, lesson: { ...(data as Omit<LessonRow, "bunny_video_id">), bunny_video_id } };
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
  if (lesson.type !== "video") return { ok: false, error: "Only video lessons can have a video." };

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
    await recordAudit(user.id, "lesson.video_upload_started", { type: "lesson", id: lessonId });
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
  revalidateWorkspaces(`/courses/${lesson.course_id}`);
  revalidateWorkspaces(`/courses/${lesson.course_id}/lessons/${lesson.id}`);
  return { ok: true };
}

export async function markVideoFailedAction(lessonId: string): Promise<{ ok: boolean }> {
  await requirePermission("courses.upload");
  const { supabase, lesson } = await loadLesson(lessonId);
  if (!lesson) return { ok: false };
  await supabase.from("lessons").update({ video_status: "failed" }).eq("id", lessonId);
  revalidateWorkspaces(`/courses/${lesson.course_id}`);
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
    if (state.state !== "processing") {
      revalidateWorkspaces(`/courses/${lesson.course_id}`);
      revalidateWorkspaces(`/courses/${lesson.course_id}/lessons/${lesson.id}`);
    }
    return { ok: true, status: state.state };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------- course intro video

type CourseVideoRow = { id: string; slug: string; title: string; intro_video_id: string | null };

async function loadCourse(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id, slug, title, intro_video_id").eq("id", courseId).maybeSingle();
  return { supabase, course: data as CourseVideoRow | null };
}

function revalidateIntro(course: CourseVideoRow) {
  revalidateWorkspaces(`/courses/${course.id}`);
  revalidatePath(`/courses/${course.slug}`);
}

export async function prepareIntroUploadAction(courseId: string): Promise<UploadTicket> {
  const user = await requirePermission("courses.upload");
  if (!isBunnyConfigured()) return { ok: false, error: "Video hosting isn't connected." };
  const { supabase, course } = await loadCourse(courseId);
  if (!course) return { ok: false, error: "Course not found." };
  try {
    const previous = course.intro_video_id;
    const videoId = await createVideo(`Intro: ${course.title}`);
    const { error } = await supabase
      .from("courses")
      .update({ intro_video_id: videoId, intro_video_status: "uploading", intro_duration_seconds: 0, updated_by: user.id })
      .eq("id", courseId);
    if (error) {
      await deleteVideo(videoId).catch(() => undefined);
      return { ok: false, error: "The course couldn't be updated." };
    }
    if (previous) await deleteVideo(previous).catch(() => undefined);
    await recordAudit(user.id, "course.intro_upload_started", { type: "course", id: courseId });
    return { ok: true, ...tusUploadCredentials(videoId) };
  } catch {
    return { ok: false, error: "Couldn't start the upload. Check the video hosting settings and try again." };
  }
}

export async function markIntroUploadedAction(courseId: string): Promise<{ ok: boolean }> {
  await requirePermission("courses.upload");
  const { supabase, course } = await loadCourse(courseId);
  if (!course) return { ok: false };
  await supabase.from("courses").update({ intro_video_status: "processing" }).eq("id", courseId);
  revalidateIntro(course);
  return { ok: true };
}

export async function markIntroFailedAction(courseId: string): Promise<{ ok: boolean }> {
  await requirePermission("courses.upload");
  const { supabase, course } = await loadCourse(courseId);
  if (!course) return { ok: false };
  await supabase.from("courses").update({ intro_video_status: "failed" }).eq("id", courseId);
  revalidateIntro(course);
  return { ok: true };
}

export async function refreshIntroStatusAction(
  courseId: string,
): Promise<{ ok: boolean; status?: "processing" | "ready" | "failed" }> {
  await requirePermission("courses.read");
  const { supabase, course } = await loadCourse(courseId);
  if (!course?.intro_video_id || !isBunnyConfigured()) return { ok: false };
  try {
    const state = await getVideoState(course.intro_video_id);
    await supabase
      .from("courses")
      .update({ intro_video_status: state.state, intro_duration_seconds: state.durationSeconds })
      .eq("id", courseId);
    if (state.state !== "processing") revalidateIntro(course);
    return { ok: true, status: state.state };
  } catch {
    return { ok: false };
  }
}

export async function removeIntroAction(courseId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requirePermission("courses.upload");
  const { supabase, course } = await loadCourse(courseId);
  if (!course) return { ok: false, error: "Course not found." };
  const { error } = await supabase
    .from("courses")
    .update({ intro_video_id: null, intro_video_status: "none", intro_duration_seconds: 0, updated_by: user.id })
    .eq("id", courseId);
  if (error) return { ok: false, error: "The intro video couldn't be removed." };
  if (course.intro_video_id && isBunnyConfigured()) await deleteVideo(course.intro_video_id).catch(() => undefined);
  revalidateIntro(course);
  return { ok: true };
}
