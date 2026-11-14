"use server";

import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";
import { revalidateWorkspaces } from "@/lib/workspace";

const schema = z.object({
  id: z.string().uuid(),
  approve: z.boolean(),
  feedback: z.string().trim().max(5000, "Keep feedback under 5,000 characters."),
});

export async function reviewAssignmentAction(input: { id: string; approve: boolean; feedback: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requirePermission("courses.edit");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review and try again." };
  const { id, approve, feedback } = parsed.data;
  if (!approve && !feedback) return { ok: false, error: "Tell the learner what to change." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_assignment", { p_submission_id: id, p_approve: approve, p_feedback: feedback || null });
  if (error) return { ok: false, error: error.code === "22023" ? error.message : "The review couldn't be saved. Please try again." };

  await recordAudit(user.id, approve ? "assignment.approve" : "assignment.request_changes", { type: "assignment_submission", id });
  revalidateWorkspaces("/assignments");
  revalidateWorkspaces(`/assignments/${id}`);
  return { ok: true };
}
