import Link from "next/link";
import { brand } from "@/brand";
import { Logo } from "@/components/brand/logo";
import { footerNav } from "@/config/navigation";

export function PublicFooter() {
  const year = new Date().getFullYear();
  const socials = Object.entries(brand.social).filter(([, url]) => url);

  return (
    <footer className="bg-block-night text-white">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-4">
            <Logo onDark />
            <p className="max-w-sm text-white/75">{brand.description}</p>
            {brand.contact.email && (
              <a href={`mailto:${brand.contact.email}`} className="w-fit text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                {brand.contact.email}
              </a>
            )}
            {brand.contact.phone && <p className="text-sm text-white/75">{brand.contact.phone}</p>}
          </div>
          {footerNav.map((group) => (
            <div key={group.title}>
              <h2 className="type-label text-white/60">{group.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[15px] text-white hover:underline hover:underline-offset-4">{link.label}</Link>
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
            <ul className="flex gap-5">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-white">{name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
