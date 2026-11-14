import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clapperboard, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { TestConnectionButton } from "@/features/settings/test-connection-button";
import { requireRole } from "@/lib/dal/session";
import { videoIntegrationStatus } from "@/lib/integrations";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  await requireRole("owner");
  const video = videoIntegrationStatus();

  return (
    <>
      <Link href="/app/owner/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Settings
      </Link>
      <PageHeader title="Integrations" description="Services the platform connects to. Keys are stored on the server and never shown in full." />

      <div className="flex max-w-3xl flex-col gap-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand">
              <Clapperboard className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-ink">{video.name}</h2>
                <StatusBadge status={video.connected ? "active" : "pending"} label={video.connected ? "Connected" : "Not connected"} />
              </div>
              <p className="text-sm text-ink-muted">{video.provider} uploads, processes and streams your course videos with signed, short-lived links.</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {video.details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs font-semibold text-ink-muted">{d.label}</dt>
                <dd className="font-mono text-sm text-ink">{d.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            {video.connected ? (
              <TestConnectionButton />
            ) : (
              <div className="flex flex-col gap-3 text-sm text-ink-muted">
                <p className="font-semibold text-ink">How to connect</p>
                <ol className="list-decimal space-y-1.5 pl-5">
                  <li>In Bunny, open <span className="font-semibold text-ink">Stream → your library → API</span> and copy the library ID, CDN hostname and API key.</li>
                  <li>Open <span className="font-semibold text-ink">Security</span> and copy the token authentication key.</li>
                  <li>Ask whoever hosts the site to add them as the <code className="rounded bg-canvas px-1">BUNNY_STREAM_*</code> server settings (see <code className="rounded bg-canvas px-1">.env.example</code>), then restart it.</li>
                  <li>Come back here and choose <span className="font-semibold text-ink">Test connection</span>.</li>
                </ol>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 opacity-80">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-canvas text-ink-muted">
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-ink">Payments</h2>
              </div>
              <p className="text-sm text-ink-muted">
                PayHere card payments and bank transfer details are managed in{" "}
                <Link href="/app/owner/settings/payments" className="font-semibold text-brand hover:underline">Settings → Payments</Link>.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
