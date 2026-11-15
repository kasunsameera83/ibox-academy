import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { safeHref, type SiteSettings } from "@/lib/cms/schema";
import { getCurrentUser } from "@/lib/dal/session";
import { homePathFor } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

const TONE: Record<SiteSettings["announcement"]["tone"], string> = {
  lilac: "bg-block-lilac", lemon: "bg-block-lemon", mint: "bg-block-mint", sky: "bg-block-sky", pink: "bg-block-pink", cream: "bg-block-cream",
};

/** Menu items come from Website → Menus & footer. */
export async function PublicHeader({ site }: { site: SiteSettings }) {
  const user = await getCurrentUser();
  const { announcement } = site;

  return (
    <>
      {announcement.enabled && announcement.text && (
        <div className={cn("text-ink", TONE[announcement.tone])}>
          <p className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center text-sm font-medium sm:px-6 lg:px-8">
            {announcement.text}
            {announcement.link && (
              <Link href={safeHref(announcement.link.href)} className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
                {announcement.link.label} <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </p>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
          {site.headerLinks.length > 0 && (
            <details className="group relative md:hidden">
              <summary aria-label="Menu" className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full hover:bg-canvas [&::-webkit-details-marker]:hidden">
                <Menu className="size-5" aria-hidden="true" />
              </summary>
              <nav aria-label="Main" className="absolute left-0 top-12 w-60 rounded-card border border-line bg-surface p-2 shadow-float">
                <ul className="flex flex-col">
                  {site.headerLinks.map((item, i) => (
                    <li key={i}>
                      <Link href={safeHref(item.href)} className="block rounded-tile px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-canvas">{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>
          )}
          <Logo />
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {site.headerLinks.map((item, i) => (
                <li key={i}>
                  <Link href={safeHref(item.href)} className="rounded-full px-3.5 py-2 text-[15px] font-medium text-ink hover:bg-canvas">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex-1" />
          {user ? (
            <ButtonLink href={homePathFor(user.role)} size="sm">
              {user.role === "student" ? "My learning" : "Dashboard"}
            </ButtonLink>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <ButtonLink href="/login" variant="secondary" size="sm">Log in</ButtonLink>
              <ButtonLink href="/signup" size="sm">Sign up free</ButtonLink>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
