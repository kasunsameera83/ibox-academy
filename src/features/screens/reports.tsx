import Link from "next/link";
import { Download, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/page-header";
import { BarChart, type BarDatum } from "@/features/reports/bar-chart";
import { formatLkr } from "@/lib/courses/format";
import { METHOD_LABELS } from "@/lib/dal/orders";
import { getReport, type ReportPoint } from "@/lib/dal/reports";
import { hasPermission, type SessionUser } from "@/lib/dal/session";
import { PRESETS, parseRange, rangeQuery, type Bucket } from "@/lib/reports/range";
import { cn, param, type SearchParams } from "@/lib/utils";

const count = new Intl.NumberFormat("en-LK");
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

function toBars(series: ReportPoint[], bucket: Bucket, pick: (p: ReportPoint) => number): BarDatum[] {
  return series.map((p) => {
    const d = new Date(`${p.start}T00:00:00Z`);
    const label = bucket === "month" ? monthFmt.format(d) : bucket === "week" ? `Week of ${dayFmt.format(d)}` : dayFmt.format(d);
    const short = bucket === "month" ? monthShort.format(d) : dayFmt.format(d);
    return { key: p.start, label, short, value: pick(p) };
  });
}

export async function ReportsScreen({ searchParams, user, base }: { searchParams: SearchParams; user: SessionUser; base: string }) {
  const sp = await searchParams;
  const range = parseRange({ range: param(sp.range), from: param(sp.from), to: param(sp.to) });
  const report = await getReport(range);
  const canExportOrders = hasPermission(user, "exports.finance");
  const q = rangeQuery(range);

  const header = (
    <PageHeader
      title="Reports"
      description={`${range.label}. Sales count when payment is confirmed; days follow Sri Lanka time.`}
    />
  );

  const controls = (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <nav aria-label="Date range" className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
        {PRESETS.map((p) => (
          <Link
            key={p.value}
            href={`${base}/reports?range=${p.value}`}
            aria-current={range.preset === p.value ? "page" : undefined}
            className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", range.preset === p.value ? "bg-brand text-on-brand" : "text-ink-muted hover:text-ink")}
          >
            {p.label}
          </Link>
        ))}
      </nav>
      <form action={`${base}/reports`} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="range" value="custom" />
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
          From
          <input type="date" name="from" defaultValue={range.fromDay} required className="h-9 rounded-control border border-line bg-surface px-2 text-sm text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
          To
          <input type="date" name="to" defaultValue={range.toDay} required className="h-9 rounded-control border border-line bg-surface px-2 text-sm text-ink" />
        </label>
        <button type="submit" className="h-9 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas">Apply</button>
      </form>
      <div className="ml-auto flex flex-wrap gap-2">
        <a href={`/api/reports/courses?${q}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas">
          <Download className="size-4" aria-hidden="true" /> Courses (CSV)
        </a>
        {canExportOrders && (
          <a href={`/api/reports/orders?${q}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas">
            <Download className="size-4" aria-hidden="true" /> Orders (CSV)
          </a>
        )}
      </div>
    </div>
  );

  if (!report) {
    return (
      <>
        {header}
        {controls}
        <Alert tone="danger">The report couldn't be loaded. Try a shorter range, or sign in again.</Alert>
      </>
    );
  }

  const t = report.totals;
  const aov = t.paidOrders ? t.revenue / t.paidOrders : 0;
  const tiles = [
    { label: "Revenue", value: formatLkr(t.revenue), hint: t.discount ? `After ${formatLkr(t.discount)} in promo discounts` : "Confirmed payments" },
    { label: "Paid orders", value: count.format(t.paidOrders), hint: t.paidOrders ? `Average ${formatLkr(aov)}` : "No paid orders yet" },
    { label: "New learners", value: count.format(t.signups), hint: "Sign-ups" },
    { label: "Enrolments", value: count.format(t.enrolments), hint: t.freeEnrolments ? `${count.format(t.freeEnrolments)} free` : "Paid, free and given" },
    { label: "Certificates", value: count.format(t.certificates), hint: "Courses completed" },
  ];
  const methodTotal = report.methods.reduce((s, m) => s + m.revenue, 0);

  return (
    <>
      {header}
      {controls}

      {(t.awaitingReview > 0 || t.refunded > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {t.awaitingReview > 0 && (
            <Link href={`${base}/payments`} className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1.5 text-sm font-semibold text-warning-ink">
              <TriangleAlert className="size-4" aria-hidden="true" /> {t.awaitingReview} payment{t.awaitingReview === 1 ? "" : "s"} waiting for review (not counted yet)
            </Link>
          )}
          {t.refunded > 0 && (
            <span className="inline-flex items-center rounded-full bg-canvas px-3 py-1.5 text-sm text-ink-muted">
              {formatLkr(t.refunded)} refunded in this period (not included)
            </span>
          )}
        </div>
      )}

      <ul className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((x) => (
          <li key={x.label} className="rounded-card border border-line bg-surface p-5">
            <p className="text-sm text-ink-muted">{x.label}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{x.value}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{x.hint}</p>
          </li>
        ))}
      </ul>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <BarChart title={`Revenue by ${report.bucket}`} kind="lkr" data={toBars(report.series, report.bucket, (p) => p.revenue)} emptyText="No confirmed payments in this period." />
        </Card>
        <Card className="p-5">
          <BarChart title={`Enrolments by ${report.bucket}`} kind="count" data={toBars(report.series, report.bucket, (p) => p.enrolments)} emptyText="No enrolments in this period." />
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Courses" description="Revenue and new enrolments are for this period. Learners, progress and completion are all-time." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Course</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Revenue</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Paid orders</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">New enrolments</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Active learners</th>
                <th scope="col" className="px-3 py-3 font-semibold">Average progress</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.courses.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-6 text-center text-ink-muted">No courses yet.</td></tr>
              )}
              {report.courses.map((c) => {
                const rate = c.enrolled ? Math.round((c.completed / c.enrolled) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td className="max-w-72 px-5 py-3">
                      <Link href={`${base}/courses/${c.id}`} className="font-medium text-ink hover:text-brand">{c.title}</Link>
                      {c.status !== "published" && <span className="block text-xs text-ink-muted">{c.status.replace("_", " ")}</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink">{formatLkr(c.revenue)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{count.format(c.paidOrders)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{count.format(c.newEnrolments)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{count.format(c.enrolled)}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line" aria-hidden="true">
                          <span className="block h-full rounded-full bg-success" style={{ width: `${c.avgProgress}%` }} />
                        </span>
                        <span className="tabular-nums text-ink">{c.enrolled ? `${c.avgProgress}%` : "—"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink">
                      {count.format(c.completed)}
                      {c.enrolled > 0 && <span className="block text-xs text-ink-muted">{rate}% of learners</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="How people paid" />
          {report.methods.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No confirmed payments in this period.</p>
          ) : (
            <ul className="flex flex-col gap-4 p-5">
              {report.methods.map((m) => {
                const share = methodTotal ? Math.round((m.revenue / methodTotal) * 100) : 0;
                return (
                  <li key={m.method}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-ink">{METHOD_LABELS[m.method as keyof typeof METHOD_LABELS] ?? m.method}</span>
                      <span className="tabular-nums text-ink">
                        {formatLkr(m.revenue)} <span className="text-ink-muted">· {count.format(m.orders)} order{m.orders === 1 ? "" : "s"} · {share}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Promo codes" description="Confirmed orders that used a code." />
          {report.codes.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No codes used in this period.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Code</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Orders</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Revenue</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.codes.map((k) => (
                  <tr key={k.code}>
                    <td className="px-5 py-2.5 font-mono font-semibold text-ink">{k.code}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-ink">{count.format(k.orders)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-ink">{formatLkr(k.revenue)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-ink-muted">{formatLkr(k.discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
