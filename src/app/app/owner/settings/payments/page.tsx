import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { BankDetailsForm } from "@/features/checkout/bank-details-form";
import { bankDetailsComplete, getBankDetails } from "@/lib/dal/orders";
import { requireRole } from "@/lib/dal/session";
import { isPayhereConfigured, payhereMode } from "@/lib/payhere";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  await requireRole("owner");
  const bank = await getBankDetails();
  const payhere = isPayhereConfigured();
  const mode = payhereMode();

  return (
    <>
      <Link href="/app/owner/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Settings
      </Link>
      <PageHeader title="Payments" description="How learners pay you. Prices are always in LKR." />
      <div className="flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader
            title="Card payments (PayHere)"
            action={<StatusBadge status={payhere ? "active" : "pending"} label={payhere ? (mode === "live" ? "Live" : "Sandbox (test)") : "Not connected"} />}
          />
          <div className="flex flex-col gap-3 p-5 text-sm text-ink-muted">
            {payhere ? (
              <p>Card checkout is on. Payments are confirmed only by PayHere's server notification, never by the browser.</p>
            ) : (
              <p>Add <code className="rounded bg-canvas px-1">PAYHERE_MERCHANT_ID</code>, <code className="rounded bg-canvas px-1">PAYHERE_MERCHANT_SECRET</code>, <code className="rounded bg-canvas px-1">PAYHERE_MODE</code> and <code className="rounded bg-canvas px-1">SUPABASE_SECRET_KEY</code> to the server settings, then restart.</p>
            )}
            <p>
              Notification URL PayHere calls: <code className="break-all rounded bg-canvas px-1 text-ink">{siteUrl()}/api/payhere/notify</code>
              {siteUrl().includes("localhost") && " (PayHere can't reach localhost; use a tunnel or a deployed preview to test card payments)."}
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Bank transfer"
            description="Learners see these details at checkout with their order reference."
            action={<StatusBadge status={bankDetailsComplete(bank) ? "active" : "pending"} label={bankDetailsComplete(bank) ? "On" : "Off until saved"} />}
          />
          <div className="p-5"><BankDetailsForm details={bank} /></div>
        </Card>
      </div>
    </>
  );
}
