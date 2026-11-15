import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/layouts/public-footer";
import { PublicHeader } from "@/components/layouts/public-header";
import { getSiteSettingsDraft } from "@/lib/dal/cms";
import { getCurrentUser, hasPermission } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Draft preview shown inside the website editor, with the draft header and
 * footer. Only the website team can open it; it's never public.
 */
export default async function PreviewLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "cms.read")) notFound();
  // Null without a two-step verified session.
  const site = await getSiteSettingsDraft();
  if (!site) notFound();
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader site={site} />
      <main id="main" className="flex-1">{children}</main>
      <PublicFooter site={site} />
    </div>
  );
}
