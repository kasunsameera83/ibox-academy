"use client";

import { useState } from "react";
import { Check, Link2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Print / save as PDF, copy the verification link, share on LinkedIn. */
export function CertificateActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button onClick={() => window.print()} className="rounded-full">
        <Printer className="size-4" aria-hidden="true" /> Print or save as PDF
      </Button>
      <Button variant="secondary" onClick={() => void copy()} className="rounded-full" aria-live="polite">
        {copied ? <Check className="size-4 text-success-ink" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
        {copied ? "Link copied" : "Copy link"}
      </Button>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas"
      >
        Share on LinkedIn
      </a>
    </div>
  );
}
