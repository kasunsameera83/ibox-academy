import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-block-lilac text-ink">
          <SearchX className="size-6" aria-hidden="true" />
        </span>
        <h1 className="type-display-md text-ink">We couldn't find that page</h1>
        <p className="text-ink-muted">The link may be broken, or the page may have moved.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href="/">Go to home page</ButtonLink>
          <ButtonLink href="/courses" variant="secondary">Browse courses</ButtonLink>
        </div>
      </div>
    </main>
  );
}
