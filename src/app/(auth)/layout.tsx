import type { ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, CreditCard } from "lucide-react";
import { brand } from "@/brand";
import { Logo } from "@/components/brand/logo";

/** Sign-in, sign-up and account recovery: form on white, brand colour block beside it. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col">
        <header className="flex w-full items-center px-4 py-5 sm:px-8">
          <Logo />
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:px-8 sm:pt-0">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
        <footer className="px-4 pb-6 text-center text-xs text-ink-muted sm:px-8 lg:text-left">
          <Link href="/policies" className="hover:text-ink">Terms & privacy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/help" className="hover:text-ink">Help</Link>
        </footer>
      </div>

      <aside aria-hidden="true" className="hidden p-3 lg:block">
        <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-card bg-block-lilac p-12">
          <div className="absolute right-12 top-14 flex w-44 rotate-3 flex-col gap-2 rounded-[6px] bg-block-lemon p-4 text-ink">
            <Clock className="size-5" />
            <span className="font-bold leading-tight">Short lessons you can finish anywhere</span>
          </div>
          <div className="absolute right-40 top-56 flex w-44 -rotate-2 flex-col gap-2 rounded-[6px] bg-block-mint p-4 text-ink">
            <CreditCard className="size-5" />
            <span className="font-bold leading-tight">Pay in rupees, by card or bank</span>
          </div>
          <div className="absolute right-16 top-[22rem] flex w-44 rotate-1 flex-col gap-2 rounded-[6px] bg-block-pink p-4 text-ink">
            <BadgeCheck className="size-5" />
            <span className="font-bold leading-tight">Certificates anyone can verify</span>
          </div>
          <p className="type-display-lg relative max-w-[12ch] text-ink">{brand.tagline}</p>
        </div>
      </aside>
    </div>
  );
}
