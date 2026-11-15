"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

/** Shown when a page fails to load. The reference helps match it to the server log. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="type-display-md text-ink">Something went wrong</h1>
        <p className="text-ink-muted">This page didn't load. Try again, and if it keeps happening, contact us.</p>
        {error.digest && <p className="text-xs text-ink-muted">Reference: {error.digest}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}><RefreshCw className="size-4" aria-hidden="true" /> Try again</Button>
          <ButtonLink href="/" variant="secondary">Go to home page</ButtonLink>
        </div>
      </div>
    </main>
  );
}
