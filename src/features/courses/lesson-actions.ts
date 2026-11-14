"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { addCaption, deleteCaption, isBunnyConfigured, testConnection } from "@/lib/bunny";
import { requirePermission, requireRole } from "@/lib/dal/session";
import { LESSON_TYPES, estimateReadingMinutes } from "@/lib/courses/lessons";
import type { LessonType, QuizOption } from "@/lib/courses/types";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

function revalidateLesson(courseId: string, lessonId: string) {
  revalidatePath(`/app/owner/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/app/owner/courses/${courseId}`);
}

async function lessonType(supabase: Awaited<ReturnType<typeof createClient>>, lessonId: string, courseId: string) {
  const { data } = await supabase.from("lessons").select("type, bunny_video_id").eq("id", lessonId).eq("course_id", courseId).maybeSingle();
  return data as { type: LessonType; bunny_video_id: string | null } | null;
}

// ---------------------------------------------------------------- details

const detailsSchema = z.object({
  title: z.string().trim().min(1, "Enter a lesson title.").max(160, "Use 160 characters or fewer."),
  description: z.string().trim().max(5000, "Use 5,000 characters or fewer."),
  sectionId: z.uuid("Choose a section."),
  status: z.enum(["draft", "published"]),
  isPreview: z.boolean(),
});

export async function saveLessonDetailsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("courses.edit");
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const values = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    sectionId: String(formData.get("sectionId") ?? ""),
    status: String(formData.get("status") ?? "draft"),
  };
  const parsed = detailsSchema.safeParse({ ...values, isPreview: formData.get("isPreview") === "on" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>, values };

  const supabase = await createClient();
  const current = await lessonType(supabase, lessonId, courseId);
  if (!current) return { error: "Lesson not found.", values };
  const isPreview = parsed.data.isPreview && LESSON_TYPES[current.type].previewable;

  const { data: section } = await supabase.from("course_sections").select("id").eq("id", parsed.data.sectionId).eq("course_id", courseId).maybeSingle();
  if (!section) return { fieldErrors: { sectionId: ["Choose a section from this course."] }, values };

  const { error } = await supabase
    .from("lessons")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      section_id: parsed.data.sectionId,
      status: parsed.data.status,
      is_preview: isPreview,
    })
    .eq("id", lessonId)
    .eq("course_id", courseId);
  if (error) return { error: "Changes couldn't be saved. Please try again.", values };

  await recordAudit(supabase, user.id, "lesson.update", { type: "lesson", id: lessonId }, { status: parsed.data.status });
  revalidateLesson(courseId, lessonId);
  return { success: "Lesson saved.", values };
}

// ---------------------------------------------------------------- text & assignment content

export async function saveLessonBodyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("courses.edit");
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const body = String(formData.get("body") ?? "");
  const readingOverride = String(formData.get("readingMinutes") ?? "").trim();
  const values = { body, readingMinutes: readingOverride };
  if (body.length > 50000) return { fieldErrors: { body: ["Keep the content under 50,000 characters."] }, values };

  const supabase = await createClient();
  const current = await lessonType(supabase, lessonId, courseId);
  if (!current || (current.type !== "text" && current.type !== "assignment")) return { error: "This lesson type has no written content.", values };

  const update: Record<string, unknown> = { body: body.trim() || null };
  if (current.type === "text") {
    const minutes = readingOverride === "" ? estimateReadingMinutes(body) : Number(readingOverride);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 600) {
      return { fieldErrors: { readingMinutes: ["Enter whole minutes between 0 and 600."] }, values };
    }
    update.reading_minutes = minutes;
  }
  if (current.type === "assignment") {
    const submission = ["text", "file"].filter((k) => formData.get(`submit_${k}`) === "on");
    if (submission.length === 0) return { fieldErrors: { submission: ["Choose at least one way to submit."] }, values };
    const maxFileMb = Number(formData.get("maxFileMb") ?? 20);
    if (!Number.isInteger(maxFileMb) || maxFileMb < 1 || maxFileMb > 100) {
      return { fieldErrors: { maxFileMb: ["Enter a size between 1 and 100 MB."] }, values };
    }
    update.settings = { submission, maxFileMb };
  }

  const { error } = await supabase.from("lessons").update(update).eq("id", lessonId).eq("course_id", courseId);
  if (error) return { error: "Changes couldn't be saved. Please try again.", values };
  revalidateLesson(courseId, lessonId);
  return { success: current.type === "text" ? "Content saved." : "Assignment saved.", values };
}

// ---------------------------------------------------------------- quiz

export async function saveQuizSettingsAction(courseId: string, lessonId: string, passPercent: number): Promise<Result> {
  await requirePermission("courses.edit");
  if (!Number.isInteger(passPercent) || passPercent < 1 || passPercent > 100) return fail("Pass mark must be between 1 and 100%.");
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update({ settings: { passPercent } }).eq("id", lessonId).eq("course_id", courseId).eq("type", "quiz");
  if (error) return fail("The pass mark couldn't be saved.");
  revalidateLesson(courseId, lessonId);
  return { ok: true };
}

const questionSchema = z.object({
  prompt: z.string().trim().min(1, "Write the question.").max(1000),
  options: z
    .array(z.object({ id: z.string().min(1).max(20), text: z.string().trim().min(1, "Options can't be empty.").max(300) }))
    .min(2, "Add at least two options.")
    .max(6, "Use six options or fewer."),
  correctOptionId: z.string().min(1, "Choose the correct answer."),
  explanation: z.string().trim().max(2000),
});

export async function saveQuestionAction(
  courseId: string,
  lessonId: string,
  questionId: string | null,
  input: { prompt: string; options: QuizOption[]; correctOptionId: string; explanation: string },
): Promise<Result> {
  await requirePermission("courses.edit");
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the question.");
  if (!parsed.data.options.some((o) => o.id === parsed.data.correctOptionId)) return fail("Choose the correct answer.");

  const supabase = await createClient();
  const current = await lessonType(supabase, lessonId, courseId);
  if (current?.type !== "quiz") return fail("This lesson isn't a quiz.");

  const row = {
    prompt: parsed.data.prompt,
    options: parsed.data.options,
    correct_option_id: parsed.data.correctOptionId,
    explanation: parsed.data.explanation || null,
  };
  if (questionId) {
    const { error } = await supabase.from("quiz_questions").update(row).eq("id", questionId).eq("lesson_id", lessonId);
    if (error) return fail("The question couldn't be saved.");
  } else {
    const { count } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
    if ((count ?? 0) >= 100) return fail("A quiz can have up to 100 questions.");
    const { error } = await supabase.from("quiz_questions").insert({ ...row, lesson_id: lessonId, position: count ?? 0 });
    if (error) return fail("The question couldn't be added.");
  }
  revalidateLesson(courseId, lessonId);
  return { ok: true };
}

export async function deleteQuestionAction(courseId: string, lessonId: string, questionId: string): Promise<Result> {
  await requirePermission("courses.edit");
  const supabase = await createClient();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId).eq("lesson_id", lessonId);
  if (error) return fail("The question couldn't be deleted.");
  revalidateLesson(courseId, lessonId);
  return { ok: true };
}

export async function moveQuestionAction(courseId: string, lessonId: string, questionId: string, direction: "up" | "down"): Promise<Result> {
  await requirePermission("courses.edit");
  const supabase = await createClient();
  const { data } = await supabase.from("quiz_questions").select("id").eq("lesson_id", lessonId).order("position");
  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
  const i = ids.indexOf(questionId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(ids.map((id, position) => supabase.from("quiz_questions").update({ position }).eq("id", id)));
  if (results.some((r) => r.error)) return fail("The order couldn't be saved.");
  revalidateLesson(courseId, lessonId);
  return { ok: true };
}

// ---------------------------------------------------------------- resources

export async function registerResourceAction(
  courseId: string,
  lessonId: string,
  file: { path: string; name: string; size: number; type: string },
): Promise<Result> {
  await requirePermission("courses.upload");
  if (!file.path.startsWith(`courses/${courseId}/lessons/${lessonId}/`)) return fail("Invalid file path.");
  const supabase = await createClient();
  const { count } = await supabase.from("lesson_resources").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  const { error } = await supabase.from("lesson_resources").insert({
    lesson_id: lessonId,
    file_name: file.name.slice(0, 200),
    storage_path: file.path,
    size_bytes: Math.max(0, Math.round(file.size)),
    mime_type: file.type || null,
    position: count ?? 0,
  });
  if (error) {
    await supabase.storage.from("lesson-resources").remove([file.path]);
    return fail("The file couldn't be attached.");
  }
  revalidateLesson(courseId, lessonId);
  return { ok: true };
}

export async function deleteResourceAction(courseId: string, lessonId: string, resourceId: string): Promise<Result> {
  await requirePermission("courses.upload");
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_resources").select("storage_path").eq("id", resourceId).eq("lesson_id", lessonId).maybeSingle();
  if (!data) return fail("File not found.");
  const { error } = await supabase.from("lesson_resources").delete().eq("id", resourceId);
  if (error) return fail("The file couldn't be removed.");
  await supabase.storage.from("lesson-resources").remove([(data as { storage_path: string }).storage_path]);
  revalidateLesson(courseId, lessonId);
  return { ok: true };
}

// ---------------------------------------------------------------- captions

const LANGS: Record<string, string> = { en: "English", si: "Sinhala", ta: "Tamil" };

export async function uploadCaptionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("courses.upload");
  const courseId = String(formData.get("courseId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const srclang = String(formData.get("srclang") ?? "");
  const file = formData.get("file");
  if (!(srclang in LANGS)) return { fieldErrors: { srclang: ["Choose a language."] } };
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { file: ["Choose a caption file (.vtt or .srt)."] } };
  if (!/\.(vtt|srt)$/i.test(file.name)) return { fieldErrors: { file: ["Use a .vtt or .srt file."] } };
  if (file.size > 900 * 1024) return { fieldErrors: { file: ["Caption files must be under 900 KB."] } };
  if (!isBunnyConfigured()) return { error: "Video hosting isn't connected." };

  const supabase = await createClient();
  const current = await lessonType(supabase, lessonId, courseId);
  if (!current?.bunny_video_id) return { error: "Upload the video before adding captions." };

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    await addCaption(current.bunny_video_id, srclang, LANGS[srclang], base64);
  } catch {
    return { error: "The captions couldn't be uploaded. Check the file and try again." };
  }
  revalidateLesson(courseId, lessonId);
  return { success: `${LANGS[srclang]} captions added.` };
}

export async function deleteCaptionAction(courseId: string, lessonId: string, srclang: string): Promise<Result> {
  await requirePermission("courses.upload");
  const supabase = await createClient();
  const current = await lessonType(supabase, lessonId, courseId);
  if (!current?.bunny_video_id || !isBunnyConfigured()) return fail("Video not found.");
  try {
    await deleteCaption(current.bunny_video_id, srclang);
  } catch {
    return fail("The captions couldn't be removed.");
  }
  revalidateLesson(courseId, lessonId);
  return { ok: true };
}

// ---------------------------------------------------------------- course-level

export async function markPreviewCheckedAction(courseId: string, checked: boolean): Promise<Result> {
  const user = await requirePermission("courses.edit");
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ preview_checked_at: checked ? new Date().toISOString() : null, updated_by: user.id })
    .eq("id", courseId);
  if (error) return fail("Couldn't save.");
  revalidatePath(`/app/owner/courses/${courseId}`);
  return { ok: true };
}

export async function testVideoConnectionAction(): Promise<{ ok: boolean; message: string }> {
  await requireRole("owner");
  return testConnection();
}
