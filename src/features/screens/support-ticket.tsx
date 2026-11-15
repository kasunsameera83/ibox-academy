import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReplyBox } from "@/features/support/reply-box";
import { TicketControls } from "@/features/support/ticket-controls";
import { TicketThread } from "@/features/support/ticket-thread";
import { formatLkr } from "@/lib/courses/format";
import { CATEGORY_LABELS, getTicket, listSupportAgents } from "@/lib/dal/support";
import { hasPermission, type SessionUser } from "@/lib/dal/session";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

export async function SupportTicketScreen({ id, user, base }: { id: string; user: SessionUser; base: string }) {
  const [t, agents] = await Promise.all([getTicket(id), listSupportAgents()]);
  if (!t) notFound();
  const can = {
    reply: hasPermission(user, "tickets.reply"),
    close: hasPermission(user, "tickets.close"),
    assign: hasPermission(user, "tickets.assign"),
  };

  return (
    <div className="flex flex-col gap-5">
      <Link href={`${base}/support`} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Support
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="type-display-md text-ink">{t.subject}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.reference} · {CATEGORY_LABELS[t.category]} · Opened {when.format(new Date(t.created_at))}</p>
        </div>
        <StatusBadge status={t.status} />
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <TicketThread messages={t.messages} viewer="team" />
          {can.reply ? (
            <ReplyBox ticketId={t.id} team closed={t.status === "closed"} />
          ) : (
            <p className="rounded-tile bg-canvas p-4 text-sm text-ink-muted">You can read this ticket. Ask the Owner for “Reply to tickets” to answer it.</p>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Learner" />
            <dl className="flex flex-col gap-3 p-5 text-sm">
              <div><dt className="text-ink-muted">Name</dt><dd className="font-semibold text-ink">{t.requester_name}</dd></div>
              <div><dt className="text-ink-muted">Email</dt><dd className="break-all font-semibold text-ink"><a href={`mailto:${t.requester_email}`} className="hover:underline">{t.requester_email}</a></dd></div>
              {hasPermission(user, "students.read") && (
                <Link href={`${base}/students/${t.requester_id}`} className="font-semibold text-brand hover:underline">Open learner profile</Link>
              )}
            </dl>
          </Card>

          {(t.order || t.course || t.order_id) && (
            <Card>
              <CardHeader title="Related" />
              <dl className="flex flex-col gap-3 p-5 text-sm">
                {t.order ? (
                  <div>
                    <dt className="text-ink-muted">Order</dt>
                    <dd className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {t.order.reference} <StatusBadge status={t.order.status} />
                    </dd>
                    <dd className="text-ink-muted">{t.order.course_title} · {formatLkr(t.order.amount_lkr)}</dd>
                  </div>
                ) : t.order_id ? (
                  <div><dt className="text-ink-muted">Order</dt><dd className="text-ink-muted">Linked, but you can't see orders.</dd></div>
                ) : null}
                {t.course && (
                  <div><dt className="text-ink-muted">Course</dt><dd className="font-semibold text-ink">{t.course.title}</dd></div>
                )}
              </dl>
            </Card>
          )}

          <Card>
            <CardHeader title="Ticket" />
            <div className="p-5">
              <TicketControls ticketId={t.id} status={t.status} priority={t.priority} assignee={t.assigned_to} agents={agents} can={can} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
