"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { signOutAction } from "@/app/(auth)/actions";

type Mode =
  | { kind: "loading" }
  | { kind: "challenge"; factorId: string }
  | { kind: "enroll"; factorId: string; qr: string; secret: string };

function friendlyError(message: string | undefined) {
  if (!message) return "That didn't work. Please try again.";
  if (/invalid|incorrect|expired/i.test(message)) return "That code didn't match. Check the time on your phone and enter the newest code.";
  if (/rate|too many/i.test(message)) return "Too many attempts. Wait a minute, then try again.";
  return "That didn't work. Please try again.";
}

/**
 * Sets up an authenticator app (first time) or asks for a code (every sign-in).
 * Also used from account settings to add a backup authenticator (mode="add").
 */
export function MfaFlow({ mode: flowMode = "signin", onDone }: { mode?: "signin" | "add"; onDone?: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === "verified");
      if (flowMode === "signin" && verified) {
        if (!cancelled) setMode({ kind: "challenge", factorId: verified.id });
        return;
      }
      // Remove abandoned, unverified set-ups before starting a new one.
      for (const f of factors?.all ?? []) {
        if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}`,
      });
      if (cancelled) return;
      if (enrollError || !data) {
        setError("Two-step verification couldn't be started. Refresh the page to try again.");
        return;
      }
      setMode({ kind: "enroll", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    return () => {
      cancelled = true;
    };
  }, [flowMode]);

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (mode.kind === "loading") return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: mode.factorId, code: code.trim() });
    setBusy(false);
    if (verifyError) {
      setError(friendlyError(verifyError.message));
      setCode("");
      return;
    }
    if (onDone) onDone();
    else {
      router.replace("/app");
      router.refresh();
    }
  }

  if (mode.kind === "loading") {
    return error ? <Alert tone="danger">{error}</Alert> : <Skeleton className="h-48 w-full" />;
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-5" noValidate>
      {mode.kind === "enroll" && (
        <ol className="flex flex-col gap-4 text-sm text-ink">
          <li>
            <span className="font-semibold">1. Install an authenticator app</span>
            <p className="text-ink-muted">Google Authenticator, Microsoft Authenticator or 1Password all work.</p>
          </li>
          <li>
            <span className="font-semibold">2. Scan this QR code</span>
            <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mode.qr} alt="QR code for your authenticator app" className="size-40 rounded-control border border-line bg-white p-2" />
              <div className="text-xs text-ink-muted">
                Can't scan it? Enter this key instead:
                <code className="mt-1 block break-all rounded-control bg-canvas px-2 py-1.5 font-mono text-sm text-ink">{mode.secret}</code>
              </div>
            </div>
          </li>
          <li>
            <span className="font-semibold">3. Enter the 6-digit code from the app</span>
          </li>
        </ol>
      )}
      {mode.kind === "challenge" && (
        <p className="text-sm text-ink-muted">Open your authenticator app and enter the 6-digit code for iBox Academy.</p>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <Input
        label="Verification code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        autoFocus
        required
      />
      <Button type="submit" size="lg" fullWidth loading={busy} disabled={code.length !== 6}>
        {mode.kind === "enroll" ? "Turn on two-step verification" : "Verify"}
      </Button>
      {flowMode === "signin" && (
        <p className="text-center text-xs text-ink-muted">
          Lost your phone? Sign out and ask the platform administrator to reset two-step verification from the Supabase dashboard.
          {" "}
          <button type="button" onClick={() => void signOutAction()} className="font-semibold text-brand hover:underline">Sign out</button>
        </p>
      )}
    </form>
  );
}
