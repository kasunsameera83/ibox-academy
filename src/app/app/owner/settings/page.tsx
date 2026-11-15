import type { Metadata } from "next";
import Link from "next/link";
import { Award, ChevronRight, CreditCard, Globe, Mail, Plug } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/page-header";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  { href: "/app/owner/website?page=site", icon: Globe, title: "Contact details & footer", text: "Email, WhatsApp, phone, address, social links, menus and footer. Edited in Website → Menus & footer." },
  { href: "/app/owner/settings/emails", icon: Mail, title: "Emails", text: "Which emails the academy sends and when, and a test email." },
  { href: "/app/owner/settings/certificate", icon: Award, title: "Certificate", text: "The default certificate design, signatures and wording for every course." },
  { href: "/app/owner/settings/payments", icon: CreditCard, title: "Payments", text: "PayHere and bank transfer details." },
  { href: "/app/owner/settings/integrations", icon: Plug, title: "Integrations", text: "Video hosting, email sending and other connected services." },
];

export default async function SettingsPage() {
  await requireRole("owner");
  return (
    <>
      <PageHeader title="Settings" description="Owner-only settings for the academy." />
      <Card>
        <ul className="divide-y divide-line">
          {SECTIONS.map(({ href, icon: Icon, title, text }) => (
            <li key={title}>
              <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-canvas">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{title}</span>
                  <span className="block text-sm text-ink-muted">{text}</span>
                </span>
                <ChevronRight className="size-5 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
