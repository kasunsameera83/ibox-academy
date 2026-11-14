import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, Hourglass, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { OrderStatusPoller } from "@/features/checkout/order-status-poller";
import { SlipUploader } from "@/features/checkout/slip-uploader";
import { UnlockedCelebration } from "@/features/checkout/unlocked-celebration";
import { formatPrice, mediaUrl } from "@/lib/courses/format";
import { METHOD_LABELS, bankDetailsComplete, getBankDetails, getOrderByReference, isExpired } from "@/lib/dal/orders";
import { getCurrentUser } from "@/lib/dal/session";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

function Panel({ icon, tone, title, children }: { icon: ReactNode; tone: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <span className={`flex size-14 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      {children}
    </div>
  );
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: SearchParams }) {
  const { reference } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/order/${reference}`)}`);

  const order = await getOrderByReference(reference);
  if (!order || order.student_id !== user.id) notFound();

  const expired = isExpired(order);
  const courseHref = order.course_slug ? `/courses/${order.course_slug}` : "/courses";
  const retryHref = order.course_slug ? `/checkout/${order.course_slug}` : "/courses";
  const bank = order.method === "bank_transfer" ? await getBankDetails() : null;

  let body: ReactNode;
  if (order.status === "paid") {
    body = (
      <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
        <UnlockedCelebration title={order.course_title} thumbnail={mediaUrl(order.course_thumbnail)} />
        <div className="flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success-ink">
            <CheckCircle2 className="size-4" aria-hidden="true" /> Payment confirmed
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Your course is ready.</h1>
          <p className="text-ink-muted">“{order.course_title}” is now in My Learning. Jump in whenever you like.</p>
          <ButtonLink href={order.course_slug ? `/learn/${order.course_slug}` : "/app/student/learning"} size="lg" className="rounded-full">Start learning</ButtonLink>
        </div>
      </div>
    );
  } else if (order.status === "under_review") {
    body = (
      <Panel icon={<Hourglass className="size-7" />} tone="bg-warning-soft text-warning-ink" title="We're checking your payment">
        <p className="max-w-prose text-ink-muted">
          {order.method === "bank_transfer"
            ? "Thanks for uploading your slip. We'll confirm the transfer and unlock your course, usually within one working day. You'll see it in My Learning."
            : "Something didn't match on this payment, so our team is checking it. Your course isn't unlocked yet. Contact support if you need help."}
        </p>
        <ButtonLink href="/app/student/payments" variant="secondary" className="rounded-full">View my payments</ButtonLink>
      </Panel>
    );
  } else if (order.status === "pending" && order.method === "payhere" && !expired && !param(sp.cancelled)) {
    body = (
      <Panel icon={<Clock className="size-7" />} tone="bg-brand-soft text-brand" title="We're confirming your payment">
        <p className="max-w-prose text-ink-muted" aria-live="polite">Your course will unlock as soon as PayHere confirms it. This page updates by itself.</p>
        <OrderStatusPoller reference={order.reference} initialStatus={order.status} />
        <ButtonLink href={`/checkout/order/${order.reference}`} variant="secondary" className="rounded-full">Refresh status</ButtonLink>
      </Panel>
    );
  } else if (order.status === "pending" && order.method === "bank_transfer" && !expired) {
    body = (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Pay by bank transfer</h1>
        {order.review_note && (
          <Alert tone="danger" title="We couldn't confirm your previous slip">{order.review_note} Please upload a new slip.</Alert>
        )}
        <ol className="flex flex-col gap-6">
          <li>
            <p className="font-bold text-ink">1. Transfer exactly {formatPrice(order.amount_lkr)}</p>
            {bank && bankDetailsComplete(bank) ? (
              <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-card border border-line bg-canvas p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-ink-muted">Bank</dt><dd className="font-semibold text-ink">{bank.bankName}</dd></div>
                {bank.branch && <div><dt className="text-ink-muted">Branch</dt><dd className="font-semibold text-ink">{bank.branch}</dd></div>}
                <div><dt className="text-ink-muted">Account name</dt><dd className="font-semibold text-ink">{bank.accountName}</dd></div>
                <div><dt className="text-ink-muted">Account number</dt><dd className="font-mono text-base font-semibold text-ink">{bank.accountNumber}</dd></div>
                <div className="sm:col-span-2"><dt className="text-ink-muted">Reference (write this in the transfer description)</dt><dd className="font-mono text-lg font-bold text-brand">{order.reference}</dd></div>
              </dl>
            ) : (
              <Alert tone="warning">Bank details aren't available right now. Please contact support.</Alert>
            )}
            {bank?.instructions && <p className="mt-2 text-sm text-ink-muted">{bank.instructions}</p>}
          </li>
          <li>
            <p className="mb-3 font-bold text-ink">2. Upload your payment slip</p>
            <SlipUploader orderId={order.id} reference={order.reference} userId={user.id} />
          </li>
        </ol>
        <p className="text-sm text-ink-muted">This order stays open for 3 days. You can come back to it from My Payments.</p>
      </div>
    );
  } else {
    const title = expired ? "This order has expired" : order.status === "cancelled" || param(sp.cancelled) ? "Payment cancelled" : order.status === "refunded" ? "This order was refunded" : "Payment wasn't completed";
    body = (
      <Panel icon={<XCircle className="size-7" />} tone="bg-danger-soft text-danger-ink" title={title}>
        <p className="max-w-prose text-ink-muted">
          {order.status === "refunded"
            ? "Your refund has been processed by the payment provider, and access to the course has ended."
            : "You have not been charged by this platform unless your bank says otherwise."}
        </p>
        <div className="flex flex-wrap gap-2">
          {order.status !== "refunded" && <ButtonLink href={retryHref} className="rounded-full">Try again</ButtonLink>}
          <ButtonLink href="/help" variant="secondary" className="rounded-full">Contact support</ButtonLink>
        </div>
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-12 sm:px-6">
      <div className="rounded-[24px] border border-line bg-surface p-6 sm:p-10">{body}</div>
      <dl className="mt-6 grid gap-3 rounded-[20px] border border-line bg-surface p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-muted">Order reference</dt><dd className="font-mono font-semibold text-ink">{order.reference}</dd></div>
        <div><dt className="text-ink-muted">Course</dt><dd className="font-semibold text-ink"><Link href={courseHref} className="hover:text-brand">{order.course_title}</Link></dd></div>
        <div><dt className="text-ink-muted">Amount</dt><dd className="font-semibold text-ink">{formatPrice(order.amount_lkr)}</dd></div>
        <div><dt className="text-ink-muted">Payment method</dt><dd className="font-semibold text-ink">{METHOD_LABELS[order.method]}</dd></div>
      </dl>
    </div>
  );
}
