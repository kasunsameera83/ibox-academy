"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

/**
 * Accepts Supabase's standard email links (used while email templates can't be
 * edited). Those links return the sign-in in the URL fragment (#access_token=…),
 * which only the browser can read, so this page finishes sign-in client-side.
 */
export default function AcceptLinkPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const next = safeNextPath(url.searchParams.get("next"));
    const code = url.searchParams.get("code");
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    // Remove tokens from the address bar and history straight away.
    window.history.replaceState(null, "", url.pathname + url.search);

    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
      return;
    }
    if (!accessToken || !refreshToken || hash.get("error")) {
      setFailed(true);
      return;
    }
    void createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) return setFailed(true);
        router.replace(next);
        router.refresh();
      });
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center">
        {failed ? (
          <>
            <h1 className="text-lg font-bold text-ink">This link has expired or was already used</h1>
            <p className="mt-2 text-sm text-ink-muted">Ask for a new invite, or reset your password if you've already set one.</p>
            <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Reset my password</Link>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-ink-muted" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Signing you in…
          </p>
        )}
      </div>
    </main>
  );
}
