import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { formatPrice } from "@/lib/courses/format";
import { METHOD_LABELS, isExpired, listMyOrders } from "@/lib/dal/orders";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Payments" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

export default async function MyPaymentsPage() {
  const user = await requireRole("student", "owner");
  const orders = await listMyOrders(user.id);

  return (
    <>
      <PageHeader title="Payments" description="Your orders, payment status and receipts." />
      <Card>
        {orders.length === 0 ? (
          <EmptyState icon={Receipt} title="No payments yet" description="Orders you place will appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/checkout/order/${o.reference}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-canvas">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{o.course_title}</p>
                    <p className="text-xs text-ink-muted">
                      <span className="font-mono">{o.reference}</span>, {METHOD_LABELS[o.method]}, {dateFormat.format(new Date(o.created_at))}
                    </p>
                  </div>
                  <span className="font-semibold text-ink">{formatPrice(o.amount_lkr)}</span>
                  {isExpired(o) ? <StatusBadge status="expired" /> : <StatusBadge status={o.status} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-sm text-ink-muted">
        Need a refund? See our <Link href="/policies" className="underline hover:text-ink">refund policy</Link> and contact support with your order reference.
      </p>
    </>
  );
}
