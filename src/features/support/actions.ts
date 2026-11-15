"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getCurrentUser, requirePermission, requireUser } from "@/lib/dal/session";
import { notifyTicketReceived, notifyTicketReply } from "@/lib/email/notify";
import { createClient } from "@/lib/supabase/server";
import { revalidateWorkspaces } from "@/lib/workspace";

const uuid = z.uuid();
type Result = { ok: true; message?: string } | { ok: false; error: string };

export type NewTicketState = {
  fieldErrors?: Partial<Record<"category" | "subject" | "body" | "form", string[]>>;
  values?: { category?: string; subject?: string; body?: string; orderId?: string };
};

const newTicket = z.object({
  category: z.enum(["payment", "access", "technical", "certificate", "refund", "other"], { message: "Choose what it's about" }),
  subject: z.string().trim().min(3, "Add a short subject").max(120, "Keep the subject under 120 characters"),
  body: z.string().trim().min(10, "Describe the problem in a few words").max(5000, "Keep it under 5,000 characters"),
  orderId: z.union([z.literal(""), z.uuid()]).optional(),
});

/** Learner opens a ticket, then lands on it. */
export async function createTicketAction(_prev: NewTicketState, form: FormData): Promise<NewTicketState> {
  await requireUser();
  const raw = {
    category: String(form.get("category") ?? ""),
    subject: String(form.get("subject") ?? ""),
    body: String(form.get("body") ?? ""),
    orderId: String(form.get("orderId") ?? ""),
  };
  const parsed = newTicket.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_support_ticket", {
    p_category: parsed.data.category,
    p_subject: parsed.data.subject,
    p_body: parsed.data.body,
    p_order_id: parsed.data.orderId || null,
  });
  if (error) {
    const known = error.code === "54000" || error.code === "22023";
    return { fieldErrors: { form: [known ? `${error.message}.`.replace(/\.\.$/, ".") : "Your message couldn't be sent. Please try again."] }, values: raw };
  }
  const newId = (data as { id: string }).id;
  after(() => notifyTicketReceived(newId));
  revalidatePath("/app/student/help");
  revalidateWorkspaces("/support");
  redirect(`/app/student/help/${newId}?sent=1`);
}

export async function replyToTicketAction(ticketId: string, body: string, internal: boolean): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again to reply." };
  if (!uuid.safeParse(ticketId).success) return { ok: false, error: "Ticket not found." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > 5000) return { ok: false, error: "Keep it under 5,000 characters." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_ticket", { p_ticket_id: ticketId, p_body: text, p_internal: internal });
  if (error) {
    const known = ["22023", "54000"].includes(error.code ?? "");
    return { ok: false, error: known ? error.message : error.code === "42501" ? "You can't reply to this ticket." : "Your reply couldn't be sent. Please try again." };
  }
  // Emails the learner only when this was a public reply from the team.
  if (!internal) after(() => notifyTicketReply(ticketId));
  revalidatePath(`/app/student/help/${ticketId}`);
  revalidateWorkspaces(`/support/${ticketId}`);
  revalidateWorkspaces("/support");
  return { ok: true, message: internal ? "Note added." : "Reply sent." };
}

export async function resolveMyTicketAction(ticketId: string): Promise<Result> {
  await requireUser();
  if (!uuid.safeParse(ticketId).success) return { ok: false, error: "Ticket not found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_my_ticket", { p_ticket_id: ticketId });
  if (error) return { ok: false, error: "This ticket couldn't be updated." };
  revalidatePath(`/app/student/help/${ticketId}`);
  revalidatePath("/app/student/help");
  revalidateWorkspaces("/support");
  return { ok: true, message: "Marked as solved. Reply any time to reopen it." };
}

const update = z.object({
  status: z.enum(["new", "open", "waiting_learner", "waiting_internal", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignee: z.union([z.literal("none"), z.uuid()]).optional(),
});

/** Team: change status, priority or who's handling it. Each needs its own permission (checked again in the database). */
export async function updateTicketAction(ticketId: string, input: z.input<typeof update>): Promise<Result> {
  await requirePermission("tickets.read");
  const parsed = update.safeParse(input);
  if (!uuid.safeParse(ticketId).success || !parsed.success) return { ok: false, error: "Check the values and try again." };
  const { status, priority, assignee } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_ticket", {
    p_ticket_id: ticketId,
    p_status: status ?? null,
    p_priority: priority ?? null,
    p_assigned_to: assignee && assignee !== "none" ? assignee : null,
    p_unassign: assignee === "none",
  });
  if (error) return { ok: false, error: error.code === "42501" ? "You don't have permission for that change." : error.code === "22023" ? error.message : "The ticket couldn't be updated." };
  revalidateWorkspaces(`/support/${ticketId}`);
  revalidateWorkspaces("/support");
  return { ok: true, message: "Ticket updated." };
}
