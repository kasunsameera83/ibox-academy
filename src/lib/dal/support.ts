import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TicketStatus = "new" | "open" | "waiting_learner" | "waiting_internal" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory = "payment" | "access" | "technical" | "certificate" | "refund" | "other";

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  payment: "Payment", access: "Course access", technical: "Technical problem", certificate: "Certificate", refund: "Refund", other: "Something else",
};
/** Learner-facing wording (blueprint status vocabulary, in plain words). */
export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: "New", open: "Open", waiting_learner: "Waiting for learner", waiting_internal: "Waiting internally", resolved: "Solved", closed: "Closed",
};
export const LEARNER_STATUS: Record<TicketStatus, string> = {
  new: "Sent", open: "We're looking into it", waiting_learner: "Waiting for your reply", waiting_internal: "We're looking into it", resolved: "Solved", closed: "Closed",
};
export const PRIORITY_LABELS: Record<TicketPriority, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };

export type Ticket = {
  id: string;
  reference: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  order_id: string | null;
  course_id: string | null;
  created_at: string;
  last_activity_at: string;
  resolved_at: string | null;
};
export type TicketMessage = { id: string; author_name: string; from_team: boolean; is_internal: boolean; body: string; created_at: string };

const COLUMNS = "id, reference, requester_id, requester_name, requester_email, category, subject, status, priority, assigned_to, order_id, course_id, created_at, last_activity_at, resolved_at";

// ---------------------------------------------------------------- learner

export async function listMyTickets(userId: string): Promise<Ticket[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select(COLUMNS).eq("requester_id", userId).order("last_activity_at", { ascending: false }).limit(100);
  return (data ?? []) as Ticket[];
}

export type TicketDetail = Ticket & {
  messages: TicketMessage[];
  order: { reference: string; status: string; amount_lkr: number; course_title: string } | null;
  course: { title: string; slug: string } | null;
};

/** A ticket with its thread. RLS hides other people's tickets and, for learners, internal notes. */
export async function getTicket(id: string): Promise<TicketDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select(COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const t = data as Ticket;
  const [{ data: messages }, order, course] = await Promise.all([
    supabase.from("ticket_messages").select("id, author_name, from_team, is_internal, body, created_at").eq("ticket_id", id).order("created_at"),
    t.order_id ? supabase.from("orders").select("reference, status, amount_lkr, course_title").eq("id", t.order_id).maybeSingle() : Promise.resolve({ data: null }),
    t.course_id ? supabase.from("courses").select("title, slug").eq("id", t.course_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    ...t,
    messages: (messages ?? []) as TicketMessage[],
    order: (order.data ?? null) as TicketDetail["order"],
    course: (course.data ?? null) as TicketDetail["course"],
  };
}

/** The learner's orders, to link a ticket to one. */
export async function listMyOrdersForSupport(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id, reference, course_title, status").eq("student_id", userId).order("created_at", { ascending: false }).limit(30);
  return (data ?? []) as { id: string; reference: string; course_title: string; status: string }[];
}

// ---------------------------------------------------------------- team

export type QueueView = "active" | "waiting" | "mine" | "unassigned" | "solved" | "all";

export const QUEUE_VIEWS: { value: QueueView; label: string }[] = [
  { value: "active", label: "Needs a reply" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
  { value: "waiting", label: "Waiting for learner" },
  { value: "solved", label: "Solved" },
  { value: "all", label: "All" },
];

const ACTIVE: TicketStatus[] = ["new", "open", "waiting_internal"];

export async function listTicketQueue(view: QueueView, userId: string, q?: string): Promise<Ticket[]> {
  const supabase = await createClient();
  let query = supabase.from("support_tickets").select(COLUMNS);
  if (view === "active") query = query.in("status", ACTIVE);
  if (view === "waiting") query = query.eq("status", "waiting_learner");
  if (view === "solved") query = query.in("status", ["resolved", "closed"]);
  if (view === "mine") query = query.eq("assigned_to", userId).not("status", "in", "(resolved,closed)");
  if (view === "unassigned") query = query.is("assigned_to", null).not("status", "in", "(resolved,closed)");
  const term = q?.trim().replace(/[%,()*]/g, " ").slice(0, 60);
  if (term) query = query.or(`reference.ilike.%${term}%,subject.ilike.%${term}%,requester_email.ilike.%${term}%,requester_name.ilike.%${term}%`);
  // Urgent first, then the ones waiting longest.
  const { data } = await query.order("last_activity_at", { ascending: view === "active" || view === "unassigned" || view === "mine" }).limit(200);
  const rank: Record<TicketPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const rows = (data ?? []) as Ticket[];
  return view === "solved" || view === "all" || view === "waiting" ? rows : [...rows].sort((a, b) => rank[a.priority] - rank[b.priority]);
}

export async function countTicketsNeedingReply(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ACTIVE);
  return count ?? 0;
}

export async function listSupportAgents(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("support_agents");
  return (data ?? []) as { id: string; name: string }[];
}

/** A learner's tickets, for the student detail screen. */
export async function listTicketsForLearner(studentId: string): Promise<Ticket[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select(COLUMNS).eq("requester_id", studentId).order("created_at", { ascending: false }).limit(20);
  return (data ?? []) as Ticket[];
}
