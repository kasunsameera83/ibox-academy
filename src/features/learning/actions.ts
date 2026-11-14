"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CourseProgress } from "@/lib/dal/learning";
import { requireUser } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

const lessonId = z.string().uuid();

function refreshLearning(slug: string) {
  revalidatePath(`/learn/${slug}`, "layout");
  revalidatePath("/app/student/learning");
  revalidatePath("/app/student/certificates");
}

/** Database errors meant for learners are raised with errcode 22023; everything else gets a generic message. */
function friendly(error: { code?: string; message: string } | null, fallback: string) {
  if (error?.code === "22023") return error.message;
  if (error?.code === "42501") return "Your access to this course has ended or this lesson isn't available.";
  return fallback;
}

export async function setLessonCompleteAction(id: string, slug: string, complete: boolean): Promise<Ok<{ progress: CourseProgress }> | Fail> {
  await requireUser();
  if (!lessonId.safeParse(id).success) return { ok: false, error: "Lesson not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_lesson_complete", { p_lesson_id: id, p_complete: complete });
  if (error) return { ok: false, error: friendly(error, "Your progress couldn't be saved. Please try again.") };
  refreshLearning(slug);
  return { ok: true, progress: data as CourseProgress };
}

export type QuizResult = {
  correct: number;
  total: number;
  percent: number;
  passPercent: number;
  passed: boolean;
  results: { id: string; chosen: string | null; correct: string | null; isCorrect: boolean; explanation: string | null }[];
  progress: CourseProgress | null;
};

const answersSchema = z.record(z.string().uuid(), z.string().min(1).max(40)).refine((v) => Object.keys(v).length <= 200);

export async function submitQuizAction(id: string, slug: string, answers: Record<string, string>): Promise<Ok<{ result: QuizResult }> | Fail> {
  await requireUser();
  if (!lessonId.safeParse(id).success) return { ok: false, error: "Quiz not found." };
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "Some answers couldn't be read. Please try again." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz", { p_lesson_id: id, p_answers: parsed.data });
  if (error) return { ok: false, error: friendly(error, "Your answers couldn't be checked. Please try again.") };
  refreshLearning(slug);
  return { ok: true, result: data as QuizResult };
}

const submissionSchema = z.object({
  text: z.string().max(20000, "Keep your answer under 20,000 characters.").optional(),
  filePath: z.string().max(400).optional(),
  fileName: z.string().max(200).optional(),
  keepFile: z.boolean().optional(),
});

export async function submitAssignmentAction(
  id: string,
  slug: string,
  input: { text?: string; filePath?: string; fileName?: string; keepFile?: boolean },
): Promise<Ok<{ progress: CourseProgress }> | Fail> {
  const user = await requireUser();
  if (!lessonId.safeParse(id).success) return { ok: false, error: "Assignment not found." };
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your answer and try again." };
  const { text, filePath, fileName, keepFile } = parsed.data;
  if (filePath && !filePath.startsWith(`${user.id}/${id}/`)) return { ok: false, error: "The file couldn't be attached. Please upload it again." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_assignment", {
    p_lesson_id: id,
    p_text: text ?? null,
    p_file_path: filePath ?? null,
    p_file_name: fileName ?? null,
    p_keep_file: Boolean(keepFile && !filePath),
  });
  if (error) return { ok: false, error: friendly(error, "Your work couldn't be submitted. Please try again.") };
  refreshLearning(slug);
  return { ok: true, progress: data as CourseProgress };
}
