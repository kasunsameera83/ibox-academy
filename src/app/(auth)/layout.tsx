import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-[1280px] items-center px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[420px] rounded-card border border-line bg-surface p-6 shadow-float sm:p-8">
          {children}
        </div>
      </main>
      <footer className="pb-6 text-center text-xs text-ink-muted">
        <Link href="/policies" className="hover:text-ink">Terms & privacy</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/help" className="hover:text-ink">Help</Link>
      </footer>
    </div>
  );
}
