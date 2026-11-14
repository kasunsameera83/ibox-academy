import Link from "next/link";
import { Building2, ExternalLink, Inbox } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { reviewBankTransferAction } from "@/features/checkout/actions";
import { formatPrice } from "@/lib/courses/format";
import { listOrdersForTeam } from "@/lib/dal/orders";
import { hasPermission, type SessionUser } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";
import { param, type SearchParams } from "@/lib/utils";


const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

const MESSAGES: Record<string, { tone: "success" | "danger"; text: string }> = {
  approve: { tone: "success", text: "Transfer approved. The learner now has access to the course." },
  reject: { tone: "success", text: "Slip rejected. The learner has been asked to upload a new one." },
  reason: { tone: "danger", text: "Give a reason when rejecting a slip, so the learner knows what to fix." },
  review: { tone: "danger", text: "That transfer couldn't be updated. It may already have been reviewed." },
};

type PaymentEvent = { id: number; provider_ref: string | null; status_code: number | null; outcome: string; signature_valid: boolean; created_at: string; order: { reference: string } | null };

export async function PaymentsScreen({ searchParams, user, base }: { searchParams: SearchParams; user: SessionUser; base: string }) {
  const sp = await searchParams;
  const canVerify = hasPermission(user, "payments.verify_bank_transfer");
  const message = MESSAGES[param(sp.done) ?? param(sp.error) ?? ""];
  const queue = await listOrdersForTeam({ status: "under_review" });
  const supabase = await createClient();

  const slipUrls = Object.fromEntries(
    await Promise.all(
      queue
        .filter((o) => o.slip_path)
        .map(async (o) => {
          const { data } = await supabase.storage.from("payment-slips").createSignedUrl(o.slip_path!, 600);
          return [o.id, data?.signedUrl ?? null] as const;
        }),
    ),
  );

  const { data: eventsData } = await supabase
    .from("payment_events")
    .select("id, provider_ref, status_code, outcome, signature_valid, created_at, order:orders(reference)")
    .order("created_at", { ascending: false })
    .limit(15);
  const events = (eventsData ?? []) as unknown as PaymentEvent[];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Check bank transfers and see what PayHere has reported."
        actions={user.role === "owner" ? <Link href={`${base}/settings/payments`} className="text-sm font-semibold text-brand hover:underline">Payment settings</Link> : undefined}
      />
      {message && <Alert tone={message.tone} className="mb-6">{message.text}</Alert>}

      <Card className="mb-6">
        <CardHeader title={`Bank transfers to check (${queue.length})`} description="Compare the slip with your bank statement before approving." />
        {queue.length === 0 ? (
          <EmptyState icon={Inbox} title="Nothing to check" description="New slips appear here as soon as learners upload them." />
        ) : (
          <ul className="divide-y divide-line">
            {queue.map((o) => (
              <li key={o.id} className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{o.course_title}</p>
                  <p className="text-sm text-ink-muted">{o.student?.full_name || o.student?.email} ({o.student?.email})</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                    <div><dt className="text-xs text-ink-muted">Reference</dt><dd className="font-mono font-semibold text-ink">{o.reference}</dd></div>
                    <div><dt className="text-xs text-ink-muted">Amount expected</dt><dd className="font-semibold text-ink">{formatPrice(o.amount_lkr)}</dd></div>
                    <div><dt className="text-xs text-ink-muted">Slip uploaded</dt><dd className="text-ink">{o.slip_uploaded_at ? dateFormat.format(new Date(o.slip_uploaded_at)) : "—"}</dd></div>
                  </dl>
                  {o.method !== "bank_transfer" && (
                    <Alert tone="warning" className="mt-3">PayHere reported an amount or currency that doesn't match this order. Check it in your PayHere account.</Alert>
                  )}
                </div>
                {o.method === "bank_transfer" && (
                  <div className="flex flex-col gap-3 lg:w-80">
                    {slipUrls[o.id] ? (
                      <a href={slipUrls[o.id]!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                        <ExternalLink className="size-4" aria-hidden="true" /> Open the slip (link valid 10 minutes)
                      </a>
                    ) : (
                      <p className="text-sm text-ink-muted">Slip not available.</p>
                    )}
                    {canVerify ? (
                    <>
                    <ConfirmForm
                      action={reviewBankTransferAction}
                      fields={{ orderId: o.id, decision: "approve" }}
                      trigger="Approve transfer"
                      triggerVariant="primary"
                      title="Approve this transfer?"
                      body={<>Only approve if {formatPrice(o.amount_lkr)} with reference <strong>{o.reference}</strong> has reached your account. The learner gets access straight away.</>}
                      confirmLabel="Approve and unlock course"
                    />
                    <details className="rounded-control border border-line p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-danger-ink">Reject slip</summary>
                      <form action={reviewBankTransferAction} className="mt-3 flex flex-col gap-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <label htmlFor={`note-${o.id}`} className="text-xs font-semibold text-ink">Reason shown to the learner</label>
                        <textarea id={`note-${o.id}`} name="note" required maxLength={500} rows={2} placeholder="e.g. The amount on the slip is LKR 4,000, not 5,000." className="rounded-control border border-line px-3 py-2 text-sm" />
                        <Button type="submit" variant="destructive" size="sm" className="w-fit">Reject and ask for a new slip</Button>
                      </form>
                    </details>
                    </>
                    ) : (
                      <p className="text-xs text-ink-muted">You can view this slip. Approving or rejecting needs the “Verify bank transfers” permission.</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent PayHere notifications" description="Every payment update PayHere sends, with the result." />
        {events.length === 0 ? (
          <EmptyState icon={Building2} title="No notifications yet" description="They appear after the first card payment." />
        ) : (
          <ul className="divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="font-mono text-xs text-ink">{e.order?.reference ?? "Unknown order"}</span>
                <span className="text-ink-muted">PayHere ID {e.provider_ref ?? "—"}</span>
                <span className="flex-1" />
                {!e.signature_valid ? (
                  <StatusBadge status="failed" label="Invalid signature (ignored)" />
                ) : (
                  <StatusBadge
                    status={e.outcome === "paid" ? "paid" : e.outcome === "pending" ? "pending" : e.outcome === "mismatch" ? "under_review" : "failed"}
                    label={{ paid: "Paid", pending: "Pending", cancelled: "Cancelled", failed: "Failed", chargeback: "Chargeback", mismatch: "Amount mismatch", unknown_order: "Unknown order", ignored: "Ignored" }[e.outcome] ?? e.outcome}
                  />
                )}
                <span className="text-xs text-ink-muted">{dateFormat.format(new Date(e.created_at))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
