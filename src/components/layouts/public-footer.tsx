import Link from "next/link";
import { brand } from "@/brand";
import { Logo } from "@/components/brand/logo";
import { footerNav } from "@/config/navigation";

export function PublicFooter() {
  const year = new Date().getFullYear();
  const socials = Object.entries(brand.social).filter(([, url]) => url);

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-muted">{brand.description}</p>
          {brand.contact.email && (
            <a href={`mailto:${brand.contact.email}`} className="text-sm font-medium text-brand hover:underline">
              {brand.contact.email}
            </a>
          )}
          {brand.contact.phone && <p className="text-sm text-ink-muted">{brand.contact.phone}</p>}
        </div>
        {footerNav.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold text-ink">{group.title}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-ink-muted hover:text-ink">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} {brand.name}. All rights reserved.</p>
          {socials.length > 0 && (
            <ul className="flex gap-4">
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-ink">{name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
