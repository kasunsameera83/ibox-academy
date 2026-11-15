import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { TestEmailButton } from "@/features/settings/test-email-button";
import { requireRole } from "@/lib/dal/session";
import { isEmailConfigured } from "@/lib/email/mailer";

export const metadata: Metadata = { title: "Emails" };

const APP_EMAILS = [
  { name: "Welcome", when: "A new learner confirms their email or first signs in with Google." },
  { name: "Payment received / you're enrolled", when: "A card payment goes through, a bank transfer is approved, or a learner enrols in a free course. Works as their receipt." },
  { name: "We got your bank slip", when: "A learner uploads a bank transfer slip." },
  { name: "We couldn't confirm your transfer", when: "Your team rejects a bank slip. Includes the reason you typed." },
  { name: "We got your message", when: "A learner opens a support ticket." },
  { name: "We replied to your ticket", when: "Your team replies to a ticket. Internal notes are never emailed." },
  { name: "Your certificate", when: "A learner finishes a course and their certificate is issued." },
];

const SUPABASE_EMAILS = [
  "Confirm your email",
  "Team invitation",
  "Sign-in link",
  "Confirm a new email address",
  "Reset password",
  "Verification code",
  "Security alerts: password, email, sign-in method or two-step sign-in changed",
];

export default async function EmailSettingsPage() {
  await requireRole("owner");
  const connected = isEmailConfigured();

  return (
    <>
      <Link href="/app/owner/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Settings
      </Link>
      <PageHeader title="Emails" description="Every email goes out from your academy mailbox with the iBox Academy design. Each one is sent once, even if something is retried." />

      <div className="flex max-w-3xl flex-col gap-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ink">Course and payment emails</h2>
            <StatusBadge status={connected ? "active" : "pending"} label={connected ? "Sending" : "Not set up"} />
          </div>
          <p className="text-sm text-ink-muted">Sent by the website when something happens.</p>
          <ul className="mt-5 divide-y divide-line rounded-card border border-line">
            {APP_EMAILS.map((e) => (
              <li key={e.name} className="px-4 py-3">
                <p className="font-semibold text-ink">{e.name}</p>
                <p className="text-sm text-ink-muted">{e.when}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-line pt-5">
            {connected ? (
              <TestEmailButton />
            ) : (
              <p className="text-sm text-ink-muted">
                Add the mail server settings first. See{" "}
                <Link href="/app/owner/settings/integrations" className="font-semibold text-brand hover:underline">Integrations</Link>.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink">Sign-in and security emails</h2>
          <p className="text-sm text-ink-muted">
            Sent by Supabase, which handles accounts and passwords. To change their wording, edit them in Supabase under{" "}
            <span className="font-semibold text-ink">Authentication → Emails</span>. The branded versions are in{" "}
            <code className="rounded bg-canvas px-1">supabase/templates/</code> in the project.
          </p>
          <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-ink">
            {SUPABASE_EMAILS.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
