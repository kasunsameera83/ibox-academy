import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReplyBox } from "@/features/support/reply-box";
import { ResolveMyTicketButton } from "@/features/support/resolve-button";
import { TicketThread } from "@/features/support/ticket-thread";
import { CATEGORY_LABELS, LEARNER_STATUS, getTicket } from "@/lib/dal/support";
import { requireRole } from "@/lib/dal/session";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Support request" };

export default async function MyTicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireRole("student", "owner");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const t = await getTicket(id);
  // Only the person who asked sees it here (team members use the support queue).
  if (!t || t.requester_id !== user.id) notFound();
  const done = t.status === "resolved" || t.status === "closed";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href="/app/student/help" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Help
      </Link>
      {param(sp.sent) && <Alert tone="success">Sent. We'll reply here and notify you. Your reference is {t.reference}.</Alert>}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="type-display-md text-ink">{t.subject}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t.reference} · {CATEGORY_LABELS[t.category]}
            {t.order && <> · Order {t.order.reference}</>}
          </p>
        </div>
        <StatusBadge status={t.status} label={LEARNER_STATUS[t.status]} tone={t.status === "waiting_learner" ? "warning" : undefined} />
      </header>

      <TicketThread messages={t.messages} viewer="learner" />

      <ReplyBox ticketId={t.id} team={false} closed={t.status === "closed"} />
      {!done && <ResolveMyTicketButton ticketId={t.id} />}
      {t.status === "resolved" && <p className="text-sm text-ink-muted">Marked as solved. Reply above if you still need help and it will reopen.</p>}
    </div>
  );
}
