import Link from "next/link";
import { brand } from "@/brand";
import { Logo } from "@/components/brand/logo";
import { safeHref, type SiteSettings } from "@/lib/cms/schema";

const SOCIAL_LABELS: Record<keyof SiteSettings["social"], string> = {
  facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn",
};

/** Columns, contact details and social links come from Website → Menus & footer. */
export function PublicFooter({ site }: { site: SiteSettings }) {
  const year = new Date().getFullYear();
  const socials = (Object.keys(SOCIAL_LABELS) as (keyof SiteSettings["social"])[]).filter((k) => site.social[k]);
  const { columns } = site.footer;

  return (
    <footer className="bg-block-night text-white">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-4">
            <Logo onDark />
            <p className="max-w-sm text-white/75">{site.description}</p>
            {site.contact.email && (
              <a href={`mailto:${site.contact.email}`} className="w-fit text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                {site.contact.email}
              </a>
            )}
            {site.contact.phone && <p className="text-sm text-white/75">{site.contact.phone}</p>}
          </div>
          {columns.map((group, gi) => (
            <div key={gi}>
              <h2 className="type-label text-white/60">{group.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link, li) => (
                  <li key={li}>
                    <Link href={safeHref(link.href)} className="text-[15px] text-white hover:underline hover:underline-offset-4">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p aria-hidden="true" className="mt-16 select-none text-[clamp(3rem,13vw,10.5rem)] font-semibold leading-[0.85] tracking-[-0.06em] text-white/10">
          {brand.shortName}
        </p>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {brand.name}. All rights reserved.</p>
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-5">
              {socials.map((k) => (
                <li key={k}>
                  <a href={safeHref(site.social[k], "#")} target="_blank" rel="noopener noreferrer" className="hover:text-white">{SOCIAL_LABELS[k]}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
