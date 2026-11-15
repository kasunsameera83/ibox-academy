import type { ReactNode } from "react";
import { PublicFooter } from "@/components/layouts/public-footer";
import { PublicHeader } from "@/components/layouts/public-header";
import { getSiteSettings } from "@/lib/dal/cms";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const site = await getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-float">
        Skip to content
      </a>
      <PublicHeader site={site} />
      <main id="main" className="flex-1">{children}</main>
      <PublicFooter site={site} />
    </div>
  );
}
