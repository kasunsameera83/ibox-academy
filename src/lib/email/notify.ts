import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/utils";
import { isEmailConfigured, sendEmail, type OutgoingEmail } from "./mailer";
import {
  bankRejectedEmail,
  certificateEmail,
  enrolledEmail,
  slipReceivedEmail,
  ticketReceivedEmail,
  ticketReplyEmail,
  welcomeEmail,
} from "./messages";

/**
 * App emails, triggered after something happens (payment confirmed, team reply…).
 *
 * - Run them inside `after()` so the person never waits for the mail server.
 * - Each reads what it needs with the server key, then sends at most once per
 *   (kind, ref): `email_log` blocks repeats, e.g. PayHere notifying twice.
 * - They never throw. A failed send frees the log entry so a later retry can go.
 */

type Admin = ReturnType<typeof createAdminClient>;
type Recipient = { id: string; email: string; name: string };

async function recipient(admin: Admin, userId: string): Promise<Recipient | null> {
  const { data } = await admin.from("profiles").select("id, email, full_name").eq("id", userId).maybeSingle();
  const row = data as { id: string; email: string | null; full_name: string | null } | null;
  if (!row) return null;
  let email = row.email;
  if (!email) {
    const { data: auth } = await admin.auth.admin.getUserById(userId);
    email = auth.user?.email ?? null;
  }
  return email ? { id: row.id, email, name: row.full_name || email.split("@")[0] } : null;
}

async function once(admin: Admin, kind: string, ref: string, to: Recipient, build: () => Omit<OutgoingEmail, "to">) {
  const { error } = await admin.from("email_log").insert({ kind, ref, recipient_id: to.id });
  if (error) {
    if (error.code !== "23505") console.error("email log failed", kind, error.code); // 23505 = already sent
    return;
  }
  const sent = await sendEmail({ to: to.email, ...build() });
  if (!sent) await admin.from("email_log").delete().eq("kind", kind).eq("ref", ref);
}

/** Wraps each event so nothing here can break the request that triggered it. */
function event<A extends unknown[]>(name: string, run: (admin: Admin, ...args: A) => Promise<void>) {
  return async (...args: A) => {
    if (!isEmailConfigured()) return;
    try {
      await run(createAdminClient(), ...args);
    } catch (error) {
      console.error("email event failed", name, (error as { code?: string })?.code ?? "");
    }
  };
}

type OrderRow = {
  id: string;
  reference: string;
  student_id: string;
  course_id: string;
  course_title: string;
  amount_lkr: number;
  method: "payhere" | "bank_transfer" | "free";
  status: string;
  slip_path: string | null;
  review_note: string | null;
  reviewed_at: string | null;
};
const ORDER_COLS = "id, reference, student_id, course_id, course_title, amount_lkr, method, status, slip_path, review_note, reviewed_at";

async function order(admin: Admin, by: { id?: string; reference?: string }): Promise<OrderRow | null> {
  let q = admin.from("orders").select(ORDER_COLS);
  q = by.id ? q.eq("id", by.id) : q.eq("reference", by.reference ?? "");
  const { data } = await q.maybeSingle();
  return data as OrderRow | null;
}

/** New learner: once per account. Team members get the invite flow instead. */
export const notifyWelcome = event("welcome", async (admin, userId: string) => {
  const { data } = await admin.from("profiles").select("role, created_at").eq("id", userId).maybeSingle();
  const profile = data as { role: string; created_at: string } | null;
  if (!profile || profile.role !== "student") return;
  // Only brand-new accounts, so existing learners don't get one on their next sign-in.
  if (Date.now() - new Date(profile.created_at).getTime() > 24 * 60 * 60 * 1000) return;
  const to = await recipient(admin, userId);
  if (to) await once(admin, "welcome", userId, to, () => welcomeEmail({ name: to.name, site: siteUrl() }));
});

/** Paid by card, approved bank transfer, or a free enrolment. */
export const notifyEnrolled = event("enrolled", async (admin, by: { id?: string; reference?: string }) => {
  const o = await order(admin, by);
  if (!o || o.status !== "paid") return;
  const to = await recipient(admin, o.student_id);
  if (!to) return;
  const { data: course } = await admin.from("courses").select("slug").eq("id", o.course_id).maybeSingle();
  const slug = (course as { slug: string } | null)?.slug;
  const site = siteUrl();
  await once(admin, "enrolled", o.id, to, () =>
    enrolledEmail({
      name: to.name,
      courseTitle: o.course_title,
      reference: o.reference,
      amount: Number(o.amount_lkr),
      method: o.method,
      url: slug ? `${site}/learn/${slug}` : `${site}/app/student/learning`,
      site,
    }),
  );
});

/** Learner uploaded a bank slip. Keyed by slip, so a re-upload after a rejection gets its own email. */
export const notifySlipReceived = event("slip", async (admin, orderId: string) => {
  const o = await order(admin, { id: orderId });
  if (!o || !o.slip_path || o.status === "paid") return;
  const to = await recipient(admin, o.student_id);
  if (!to) return;
  await once(admin, "slip_received", `${o.id}:${o.slip_path}`, to, () =>
    slipReceivedEmail({ name: to.name, courseTitle: o.course_title, reference: o.reference, amount: Number(o.amount_lkr), url: `${siteUrl()}/checkout/order/${o.reference}` }),
  );
});

/** Team rejected a bank slip, with their reason. */
export const notifyBankRejected = event("bank_rejected", async (admin, orderId: string) => {
  const o = await order(admin, { id: orderId });
  if (!o || o.status === "paid" || !o.review_note) return;
  const to = await recipient(admin, o.student_id);
  if (!to) return;
  await once(admin, "bank_rejected", `${o.id}:${o.reviewed_at ?? o.slip_path ?? ""}`, to, () =>
    bankRejectedEmail({ name: to.name, courseTitle: o.course_title, reference: o.reference, reason: o.review_note!, url: `${siteUrl()}/checkout/order/${o.reference}` }),
  );
});

type TicketRow = { id: string; reference: string; requester_id: string; subject: string };

async function ticket(admin: Admin, id: string): Promise<TicketRow | null> {
  const { data } = await admin.from("support_tickets").select("id, reference, requester_id, subject").eq("id", id).maybeSingle();
  return data as TicketRow | null;
}

/** Confirmation that a learner's support request arrived. */
export const notifyTicketReceived = event("ticket_received", async (admin, ticketId: string) => {
  const t = await ticket(admin, ticketId);
  if (!t) return;
  const to = await recipient(admin, t.requester_id);
  if (to) await once(admin, "ticket_received", t.id, to, () => ticketReceivedEmail({ name: to.name, subject: t.subject, reference: t.reference, url: `${siteUrl()}/app/student/help/${t.id}` }));
});

/** The team's newest public reply on a ticket. Internal notes are never emailed. */
export const notifyTicketReply = event("ticket_reply", async (admin, ticketId: string) => {
  const t = await ticket(admin, ticketId);
  if (!t) return;
  const { data } = await admin
    .from("ticket_messages")
    .select("id, author_name, from_team, is_internal, body")
    .eq("ticket_id", t.id)
    .eq("is_internal", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const m = data as { id: string; author_name: string; from_team: boolean; is_internal: boolean; body: string } | null;
  if (!m || !m.from_team || m.is_internal) return;
  const to = await recipient(admin, t.requester_id);
  if (to) {
    await once(admin, "ticket_reply", m.id, to, () =>
      ticketReplyEmail({ name: to.name, subject: t.subject, reference: t.reference, author: m.author_name, body: m.body, url: `${siteUrl()}/app/student/help/${t.id}` }),
    );
  }
});

/**
 * Certificates are issued inside the database when the last lesson or assignment is done,
 * so after any progress step we email certificates issued in the last day that haven't gone out.
 */
export const notifyNewCertificates = event("certificate", async (admin, studentId: string) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin.from("certificates").select("id, code, course_title").eq("student_id", studentId).gte("issued_at", since);
  const certs = (data ?? []) as { id: string; code: string; course_title: string }[];
  if (certs.length === 0) return;
  const to = await recipient(admin, studentId);
  if (!to) return;
  const site = siteUrl();
  for (const c of certs) {
    await once(admin, "certificate", c.id, to, () =>
      certificateEmail({ name: to.name, courseTitle: c.course_title, code: c.code, url: `${site}/certificates/${c.code}`, site }),
    );
  }
});

/** The learner a submission belongs to, for certificate checks after an approval. */
export async function submissionStudent(submissionId: string): Promise<string | null> {
  try {
    const { data } = await createAdminClient().from("assignment_submissions").select("student_id").eq("id", submissionId).maybeSingle();
    return (data as { student_id: string } | null)?.student_id ?? null;
  } catch {
    return null;
  }
}
