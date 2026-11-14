"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Builds a checkout link with the code already filled in, for posts and messages. */
export function ShareLink({ code, siteUrl, courses }: { code: string; siteUrl: string; courses: { slug: string; title: string }[] }) {
  const [slug, setSlug] = useState(courses[0]?.slug ?? "");
  const [copied, setCopied] = useState(false);
  const url = slug ? `${siteUrl}/checkout/${slug}?code=${encodeURIComponent(code)}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  if (!courses.length) return <p className="text-sm text-ink-muted">Publish a course this code applies to, then share its link here.</p>;

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Course
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-11 rounded-control border border-line bg-surface px-3 text-sm font-normal">
          {courses.map((c) => (
            <option key={c.slug} value={c.slug}>{c.title}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Checkout link" className="h-11 min-w-0 flex-1 rounded-control border border-line bg-canvas px-3 text-xs text-ink" />
        <Button variant="secondary" onClick={() => void copy()} aria-live="polite">
          {copied ? <Check className="size-4 text-success-ink" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-ink-muted">The code is filled in for them at checkout. If they aren't signed in, it's kept through sign-in.</p>
    </div>
  );
}
