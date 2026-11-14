import Link from "next/link";
import { brand } from "@/brand";
import { cn } from "@/lib/utils";

/** Built-in mark. Uses the brand token, so it follows colour changes. */
export function BrandMark({ className }: { className?: string }) {
  if (brand.logo.mark) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logo.mark} alt="" className={cn("size-8", className)} />;
  }
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--brand-primary)" />
      <rect x="8" y="8" width="16" height="16" rx="4" fill="none" stroke="var(--brand-on-primary)" strokeWidth="2.4" opacity="0.45" />
      <circle cx="16" cy="11.6" r="1.9" fill="var(--brand-on-primary)" />
      <rect x="14.4" y="14.6" width="3.2" height="7.6" rx="1.6" fill="var(--brand-on-primary)" />
    </svg>
  );
}

export function Logo({
  href = "/",
  onDark = false,
  showName = true,
  className,
}: {
  href?: string;
  onDark?: boolean;
  showName?: boolean;
  className?: string;
}) {
  const fullLogo = onDark ? brand.logo.fullOnDark ?? brand.logo.full : brand.logo.full;

  return (
    <Link
      href={href}
      aria-label={`${brand.name} home`}
      className={cn("inline-flex items-center gap-2.5 rounded-control", className)}
    >
      {fullLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fullLogo} alt={brand.name} className="h-8 w-auto" />
      ) : (
        <>
          <BrandMark />
          {showName && (
            <span className={cn("text-lg font-bold tracking-tight", onDark ? "text-white" : "text-ink")}>
              {brand.name}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
