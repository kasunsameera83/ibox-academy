import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getLessonBody } from "./courses";

export type SubmissionStatus = "submitted" | "approved" | "changes_requested";

export type TeamSubmissionRow = {
  id: string;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  has_file: boolean;
  student: { full_name: string | null; email: string | null } | null;
  lesson: { id: string; title: string } | null;
  course: { title: string; slug: string } | null;
};

const LIST_SELECT =
  "id, status, submitted_at, reviewed_at, file_path, student:profiles!assignment_submissions_student_id_fkey(full_name, email), lesson:lessons(id, title), course:courses(title, slug)";

/** Oldest first for the review queue, newest first otherwise. */
export async function listSubmissionsForTeam(status?: SubmissionStatus): Promise<TeamSubmissionRow[]> {
  const supabase = await createClient();
  let query = supabase.from("assignment_submissions").select(LIST_SELECT).limit(200);
  query = status ? query.eq("status", status) : query;
  query = query.order("submitted_at", { ascending: status === "submitted" });
  const { data } = await query;
  return ((data ?? []) as unknown as (Omit<TeamSubmissionRow, "has_file"> & { file_path: string | null })[]).map(
    ({ file_path, ...row }) => ({ ...row, has_file: Boolean(file_path) }),
  );
}

export async function countSubmissionsToReview(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("assignment_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted");
  return count ?? 0;
}

export type TeamSubmission = {
  id: string;
  status: SubmissionStatus;
  text_answer: string | null;
  file_name: string | null;
  file_url: string | null;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  student: { full_name: string | null; email: string | null } | null;
  reviewer: { full_name: string | null; email: string | null } | null;
  lesson: { id: string; title: string; settings: { submission?: string[] } } | null;
  course: { id: string; title: string; slug: string } | null;
  instructions: string | null;
};

export async function getSubmissionForTeam(id: string): Promise<TeamSubmission | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_submissions")
    .select(
      "id, status, text_answer, file_path, file_name, feedback, submitted_at, reviewed_at, student:profiles!assignment_submissions_student_id_fkey(full_name, email), reviewer:profiles!assignment_submissions_reviewed_by_fkey(full_name, email), lesson:lessons(id, title, settings), course:courses(id, title, slug)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Omit<TeamSubmission, "file_url" | "instructions"> & { file_path: string | null };

  const [signed, instructions] = await Promise.all([
    row.file_path
      ? supabase.storage.from("assignment-submissions").createSignedUrl(row.file_path, 60 * 30, { download: row.file_name ?? true })
      : Promise.resolve(null),
    row.lesson ? getLessonBody(row.lesson.id) : Promise.resolve(null),
  ]);
  const { file_path: _path, ...rest } = row;
  void _path;
  return { ...rest, file_url: signed?.data?.signedUrl ?? null, instructions };
}

/** The next submission waiting in the queue after this one (for "Review next"). */
export async function nextSubmissionToReview(afterId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_submissions")
    .select("id")
    .eq("status", "submitted")
    .neq("id", afterId)
    .order("submitted_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
