import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pause, Play, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionDialog } from "@/features/people/action-dialog";
import { CouponForm } from "@/features/promotions/coupon-form";
import { deleteCouponAction, setCouponActiveAction } from "@/features/promotions/actions";
import { ShareLink } from "@/features/promotions/share-link";
import { formatLkr, formatPrice } from "@/lib/courses/format";
import { listCoursesForAccess } from "@/lib/dal/people";
import { getCoupon } from "@/lib/dal/promotions";
import { requireRole } from "@/lib/dal/session";
import { param, siteUrl, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Promo code" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

export default async function PromotionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  await requireRole("owner");
  const { id } = await params;
  const sp = await searchParams;
  const [data, courses] = await Promise.all([getCoupon(id), listCoursesForAccess()]);
  if (!data) notFound();
  const { coupon: c, stats, state, orders } = data;
  const shareable = courses.filter((x) => x.status === "published" && (c.applies_to_all || c.course_ids.includes(x.id)));

  const tiles = [
    { label: "Paid orders", value: `${stats.paidUses}${c.max_redemptions !== null ? ` of ${c.max_redemptions}` : ""}` },
    { label: "Revenue", value: formatLkr(stats.revenue) },
    { label: "Discount given", value: formatLkr(stats.discountGiven) },
  ];

  return (
    <>
      <Link href="/app/owner/promotions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Promotions
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="rounded-control border-2 border-dashed border-brand bg-brand-soft px-4 py-1.5 font-mono text-2xl font-bold tracking-wider text-brand">{c.code}</h1>
          <StatusBadge status={state} />
          <span className="text-sm text-ink-muted">{c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatPrice(c.discount_value)} off`}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.is_active ? (
            <ActionDialog
              trigger={<><Pause className="size-4" aria-hidden="true" /> Pause</>}
              title={`Pause ${c.code}?`}
              body="Learners can't use it until you resume it. Orders already placed with it aren't affected."
              confirmLabel="Pause code"
              run={async () => {
                "use server";
                return setCouponActiveAction(c.id, false);
              }}
            />
          ) : (
            <ActionDialog
              trigger={<><Play className="size-4" aria-hidden="true" /> Resume</>}
              title={`Resume ${c.code}?`}
              body="Learners can use it again, within its dates and limits."
              confirmLabel="Resume code"
              run={async () => {
                "use server";
                return setCouponActiveAction(c.id, true);
              }}
            />
          )}
          {orders.length === 0 && (
            <ActionDialog
              trigger={<><Trash2 className="size-4" aria-hidden="true" /> Delete</>}
              triggerVariant="tertiary"
              title={`Delete ${c.code}?`}
              body="Nobody has used it yet, so it's removed completely."
              confirmLabel="Delete code"
              confirmVariant="destructive"
              run={async () => {
                "use server";
                return deleteCouponAction(c.id);
              }}
            />
          )}
        </div>
      </div>

      {param(sp.created) && <Alert tone="success" className="mb-6">{c.code} is ready. Share the code, or copy a checkout link below.</Alert>}

      <ul className="mb-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-card border border-line bg-surface p-5">
            <p className="text-sm text-ink-muted">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] tabular-nums text-ink">{t.value}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Settings" description={orders.length ? "Changes apply to new orders only." : undefined} />
            <div className="p-5">
              <CouponForm coupon={c} courses={courses} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Orders with this code" />
            {orders.length === 0 ? (
              <p className="p-5 text-sm text-ink-muted">Nobody has used it yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="border-b border-line text-xs text-ink-muted">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-semibold">Learner</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Course</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Paid</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                      <th scope="col" className="px-5 py-2.5 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-5 py-2.5 text-ink">{o.student?.full_name || o.student?.email || "Learner"}</td>
                        <td className="max-w-48 truncate px-3 py-2.5 text-ink">{o.course_title}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                          {formatLkr(o.amount_lkr)}
                          <span className="block text-xs text-success-ink">−{formatLkr(o.discount_lkr)}</span>
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                        <td className="px-5 py-2.5 text-xs text-ink-muted">{dateFormat.format(new Date(o.created_at))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader title="Share" description="A checkout link with the code already filled in." />
            <div className="p-5">
              <ShareLink code={c.code} siteUrl={siteUrl()} courses={shareable.map((x) => ({ slug: x.slug, title: x.title }))} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
