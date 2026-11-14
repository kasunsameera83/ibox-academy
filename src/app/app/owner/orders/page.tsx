import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { formatPrice } from "@/lib/courses/format";
import { METHOD_LABELS, isExpired, listOrdersForTeam } from "@/lib/dal/orders";
import { requireRole } from "@/lib/dal/session";
import { cn, param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "under_review", label: "Under review" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner");
  const sp = await searchParams;
  const status = param(sp.status) ?? "";
  const q = param(sp.q) ?? "";
  const orders = await listOrdersForTeam({ status: status || undefined, q: q || undefined });
  const paidTotal = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount_lkr, 0);

  return (
    <>
      <PageHeader title="Orders" description="Every purchase and enrolment, newest first." />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `/app/owner/orders?status=${f.value}` : "/app/owner/orders"}
              aria-current={status === f.value ? "page" : undefined}
              className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", status === f.value ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-canvas hover:text-ink")}
            >
              {f.label}
            </Link>
          ))}
          <form className="ml-auto" action="/app/owner/orders">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="order-q" className="sr-only">Search by reference</label>
            <input id="order-q" name="q" defaultValue={q} placeholder="Search reference" className="h-9 w-44 rounded-control border border-line px-3 text-sm" />
          </form>
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders" description={status || q ? "Try another filter." : "Orders appear here as soon as learners check out."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Reference</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Learner</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Course</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Method</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Amount</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3 font-mono text-xs text-ink">{o.reference}</td>
                    <td className="px-3 py-3">
                      <span className="block font-medium text-ink">{o.student?.full_name || "—"}</span>
                      <span className="block text-xs text-ink-muted">{o.student?.email}</span>
                    </td>
                    <td className="max-w-56 truncate px-3 py-3 text-ink">{o.course_title}</td>
                    <td className="px-3 py-3 text-ink-muted">{METHOD_LABELS[o.method]}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink">{formatPrice(o.amount_lkr)}</td>
                    <td className="px-3 py-3">{isExpired(o) ? <StatusBadge status="expired" /> : <StatusBadge status={o.status} />}</td>
                    <td className="px-5 py-3 text-xs text-ink-muted">{dateFormat.format(new Date(o.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {orders.length > 0 && (
          <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
            Paid in this view: <span className="font-semibold text-ink">{formatPrice(paidTotal)}</span> (gross, before PayHere fees and refunds).
          </p>
        )}
      </Card>
    </>
  );
}
