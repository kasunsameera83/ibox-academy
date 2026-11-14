import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CreditCard, Globe, Mail, Plug } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/page-header";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  { href: "/app/owner/settings/integrations", icon: Plug, title: "Integrations", text: "Video hosting and other connected services.", live: true },
  { href: "/app/owner/settings/payments", icon: CreditCard, title: "Payments", text: "PayHere and bank transfer details.", live: true },
  { href: null, icon: Globe, title: "Platform identity", text: "Brand, locale, currency and contact details.", live: false, phase: 4 },
  { href: null, icon: Mail, title: "Email templates", text: "Receipts, reminders and account emails.", live: false, phase: 4 },
];

export default async function SettingsPage() {
  await requireRole("owner");
  return (
    <>
      <PageHeader title="Settings" description="Owner-only configuration for the platform." />
      <Card>
        <ul className="divide-y divide-line">
          {SECTIONS.map(({ href, icon: Icon, title, text, live, phase }) => {
            const inner = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{title}</span>
                  <span className="block text-sm text-ink-muted">{text}</span>
                </span>
                {live ? <ChevronRight className="size-5 text-ink-muted" aria-hidden="true" /> : <span className="text-xs font-semibold text-ink-muted">Phase {phase ?? 4}</span>}
              </>
            );
            return (
              <li key={title}>
                {href ? (
                  <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-canvas">{inner}</Link>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4 opacity-70">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
