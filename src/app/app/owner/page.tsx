import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookPlus, ClipboardCheck, FileClock, Landmark } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/page-header";
import { BarChart } from "@/features/reports/bar-chart";
import { formatLkr } from "@/lib/courses/format";
import { countSubmissionsToReview } from "@/lib/dal/assignments";
import { getReport } from "@/lib/dal/reports";
import { requireRole } from "@/lib/dal/session";
import { parseRange } from "@/lib/reports/range";
import { firstName, greeting } from "@/lib/shell-user";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Owner overview" };

const count = new Intl.NumberFormat("en-LK");
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function OwnerOverviewPage() {
  const user = await requireRole("owner");
  const range = parseRange({ range: "30d" });
  const supabase = await createClient();
  const [report, toReview, { count: drafts }] = await Promise.all([
    getReport(range),
    countSubmissionsToReview(),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  const t = report?.totals;

  const kpis = [
    { label: "Revenue", value: formatLkr(t?.revenue ?? 0) },
    { label: "Paid orders", value: count.format(t?.paidOrders ?? 0) },
    { label: "New learners", value: count.format(t?.signups ?? 0) },
    { label: "Enrolments", value: count.format(t?.enrolments ?? 0) },
  ];

  const attention = [
    { label: "Payments to check", value: t?.awaitingReview ?? 0, href: "/app/owner/payments", icon: Landmark, block: "bg-block-lemon" },
    { label: "Assignments to review", value: toReview, href: "/app/owner/assignments", icon: ClipboardCheck, block: "bg-block-lilac" },
    { label: "Draft courses", value: drafts ?? 0, href: "/app/owner/courses?status=draft", icon: FileClock, block: "bg-block-mint" },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(user)}`}
        description="Your academy over the last 30 days."
        actions={
          <>
            <ButtonLink href="/app/owner/reports" variant="secondary" size="sm">Full reports</ButtonLink>
            <ButtonLink href="/app/owner/courses" size="sm"><BookPlus className="size-4" aria-hidden="true" />Create course</ButtonLink>
          </>
        }
      />

      <section aria-label="Key numbers, last 30 days" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-sm text-ink-muted">{k.label}</p>
            <p className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.03em] tabular-nums text-ink">{k.value}</p>
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <BarChart
            title="Revenue by day"
            kind="lkr"
            data={(report?.series ?? []).map((p) => {
              const d = new Date(`${p.start}T00:00:00Z`);
              return { key: p.start, label: dayFmt.format(d), short: dayFmt.format(d), value: p.revenue };
            })}
            emptyText="No confirmed payments in the last 30 days."
          />
        </Card>
        <Card>
          <CardHeader title="Needs your attention" />
          <ul className="flex flex-col gap-2 p-3">
            {attention.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className={cn("group flex items-center gap-4 rounded-tile p-4 text-ink", a.value > 0 ? a.block : "bg-canvas")}>
                  <a.icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 font-semibold">{a.label}</span>
                  <span className="text-2xl font-semibold tracking-[-0.03em] tabular-nums">{a.value}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          {attention.every((a) => a.value === 0) && <p className="px-5 pb-5 text-sm text-ink-muted">You're all caught up.</p>}
        </Card>
      </div>
    </>
  );
}
