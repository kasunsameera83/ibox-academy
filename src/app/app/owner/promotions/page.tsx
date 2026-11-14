import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { CouponForm } from "@/features/promotions/coupon-form";
import { formatLkr, formatPrice } from "@/lib/courses/format";
import { listCoursesForAccess } from "@/lib/dal/people";
import { listCoupons } from "@/lib/dal/promotions";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Promotions" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

export default async function PromotionsPage() {
  await requireRole("owner");
  const [rows, courses] = await Promise.all([listCoupons(), listCoursesForAccess()]);
  const revenue = rows.reduce((s, r) => s + r.stats.revenue, 0);
  const uses = rows.reduce((s, r) => s + r.stats.paidUses, 0);

  return (
    <>
      <PageHeader
        title="Promotions"
        description={rows.length ? `${uses} paid order${uses === 1 ? "" : "s"} used a code, bringing in ${formatLkr(revenue)}.` : "Promo codes for launches, influencers and free access."}
      />

      <Card className="mb-6">
        <details className="group" open={rows.length === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-base font-semibold text-ink">New promo code</span>
            <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-on-brand group-open:hidden">Create</span>
          </summary>
          <div className="border-t border-line p-5">
            <CouponForm courses={courses} />
          </div>
        </details>
      </Card>

      <Card>
        <CardHeader title="Your codes" />
        {rows.length === 0 ? (
          <EmptyState icon={Tag} title="No promo codes yet" description="Create one above, then share it or its checkout link." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Code</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Discount</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Courses</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Uses</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Revenue</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ coupon: c, stats, state }) => (
                  <tr key={c.id} className="relative hover:bg-canvas">
                    <td className="px-5 py-3">
                      <Link href={`/app/owner/promotions/${c.id}`} className="font-mono font-bold tracking-wide text-ink after:absolute after:inset-0">{c.code}</Link>
                      {c.description && <span className="block max-w-56 truncate text-xs text-ink-muted">{c.description}</span>}
                    </td>
                    <td className="px-3 py-3 text-ink">{c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatPrice(c.discount_value)} off`}</td>
                    <td className="px-3 py-3 text-ink-muted">{c.applies_to_all ? "All" : `${c.course_ids.length} course${c.course_ids.length === 1 ? "" : "s"}`}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">
                      {stats.paidUses}
                      {c.max_redemptions !== null && <span className="text-ink-muted"> / {c.max_redemptions}</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{formatLkr(stats.revenue)}</td>
                    <td className="px-3 py-3"><StatusBadge status={state} /></td>
                    <td className="px-5 py-3 text-xs text-ink-muted">{c.ends_at ? dateFormat.format(new Date(c.ends_at)) : "No end"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
