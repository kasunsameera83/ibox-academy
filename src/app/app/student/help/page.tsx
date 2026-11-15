import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, LifeBuoy, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { CATEGORY_LABELS, LEARNER_STATUS, listMyTickets } from "@/lib/dal/support";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Help" };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Colombo" });

/** Help and support (blueprint: search help, create ticket, ticket status and replies). */
export default async function HelpPage() {
  const user = await requireRole("student", "owner");
  const tickets = await listMyTickets(user.id);

  return (
    <>
      <PageHeader
        title="Help"
        description="Find a quick answer, or ask our team. We reply here and send you a notification."
        actions={<ButtonLink href="/app/student/help/new"><MessageCircle className="size-4" aria-hidden="true" /> Ask for help</ButtonLink>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link href="/help" className="flex items-start gap-4 rounded-card bg-block-sky p-5 text-ink hover:brightness-[0.98]">
          <BookOpen className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <span>
            <span className="block font-bold">Help centre</span>
            <span className="text-sm">Answers about paying, learning and certificates.</span>
          </span>
        </Link>
        <Link href="/policies" className="flex items-start gap-4 rounded-card bg-block-cream p-5 text-ink hover:brightness-[0.98]">
          <LifeBuoy className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <span>
            <span className="block font-bold">Refunds and policies</span>
            <span className="text-sm">How refunds work and what we do with your data.</span>
          </span>
        </Link>
      </div>

      <Card>
        <CardHeader title="Your requests" />
        {tickets.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No requests yet" description="If something's not working, ask us. A real person will reply." className="border-0" />
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/app/student/help/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-canvas">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{t.subject}</p>
                    <p className="text-sm text-ink-muted">{t.reference} · {CATEGORY_LABELS[t.category]} · Updated {when.format(new Date(t.last_activity_at))}</p>
                  </div>
                  <StatusBadge status={t.status} label={LEARNER_STATUS[t.status]} tone={t.status === "waiting_learner" ? "warning" : undefined} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
