import Link from "next/link";
import { Inbox, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { CATEGORY_LABELS, PRIORITY_LABELS, QUEUE_VIEWS, listSupportAgents, listTicketQueue, type QueueView } from "@/lib/dal/support";
import type { SessionUser } from "@/lib/dal/session";
import { cn, param, type SearchParams } from "@/lib/utils";

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const PRIORITY_TONE = { urgent: "danger", high: "warning", normal: "neutral", low: "neutral" } as const;

/** Support queue (blueprint: ticket queue, assignment, priority, status, internal notes). */
export async function SupportListScreen({ user, base, searchParams }: { user: SessionUser; base: string; searchParams: SearchParams }) {
  const sp = await searchParams;
  const viewParam = param(sp.view);
  const view: QueueView = QUEUE_VIEWS.some((v) => v.value === viewParam) ? (viewParam as QueueView) : "active";
  const q = param(sp.q)?.slice(0, 60) ?? "";
  const [tickets, agents] = await Promise.all([listTicketQueue(view, user.id, q), listSupportAgents()]);
  const names = new Map(agents.map((a) => [a.id, a.name]));
  const href = (v: QueueView) => `${base}/support?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title="Support" description="Learner questions, newest activity first. Urgent and high priority rise to the top." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Ticket views" className="-mx-1 overflow-x-auto px-1">
          <ul className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
            {QUEUE_VIEWS.map((v) => (
              <li key={v.value}>
                <Link href={href(v.value)} aria-current={view === v.value ? "page" : undefined} className={cn("inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold", view === v.value ? "bg-ink text-white" : "text-ink hover:bg-ink/5")}>
                  {v.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action={`${base}/support`} role="search" className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-4 pr-1 lg:w-80">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="ticket-search" className="sr-only">Search tickets</label>
          <Search className="size-4 text-ink-muted" aria-hidden="true" />
          <input id="ticket-search" name="q" type="search" defaultValue={q} maxLength={60} placeholder="Reference, subject or email" className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <button type="submit" className="h-8 rounded-full bg-ink px-4 text-sm font-semibold text-white">Search</button>
        </form>
      </div>

      <Card>
        {tickets.length === 0 ? (
          <EmptyState icon={Inbox} title={q ? "No tickets match" : "Nothing here"} description={view === "active" && !q ? "Every question has been answered." : "Try another view or search."} className="border-0" />
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`${base}/support/${t.id}`} className="grid gap-2 px-5 py-4 hover:bg-canvas md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {(t.priority === "urgent" || t.priority === "high") && <StatusBadge status={t.priority} label={PRIORITY_LABELS[t.priority]} tone={PRIORITY_TONE[t.priority]} />}
                      <p className="truncate font-semibold text-ink">{t.subject}</p>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">
                      {t.requester_name} · {CATEGORY_LABELS[t.category]} · {t.reference}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted md:justify-end">
                    <span>{t.assigned_to ? names.get(t.assigned_to) ?? "Someone" : "Unassigned"}</span>
                    <span>{ago(t.last_activity_at)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
