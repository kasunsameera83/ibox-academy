"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { recordSecurityEventAction } from "./actions";
import { MfaFlow } from "./mfa-flow";

type Factor = { id: string; friendly_name?: string | null; created_at: string; status: string };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function SecurityPanel({ mfaRequired }: { mfaRequired: boolean }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactors(((data?.totp ?? []) as Factor[]).filter((f) => f.status === "verified"));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    setConfirmRemove(null);
    if (error) return setMessage({ tone: "danger", text: "The authenticator couldn't be removed. Sign in again and retry." });
    await recordSecurityEventAction("account.mfa_removed");
    setMessage({ tone: "success", text: "Authenticator removed." });
    await load();
    router.refresh();
  }

  async function signOutOthers() {
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) return setMessage({ tone: "danger", text: "Other devices couldn't be signed out. Please try again." });
    await recordSecurityEventAction("account.signed_out_others");
    setMessage({ tone: "success", text: "All other devices have been signed out. This device stays signed in." });
  }

  const count = factors?.length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <section aria-labelledby="mfa-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-brand" aria-hidden="true" />
          <h3 id="mfa-heading" className="font-bold text-ink">Two-step verification</h3>
        </div>
        <p className="text-sm text-ink-muted">
          {mfaRequired
            ? "Required for your account. Add a second authenticator (for example on a tablet) so you're not locked out if you lose your phone."
            : "Optional. Adds a code from your phone each time you sign in."}
        </p>
        {factors === null ? (
          <Skeleton className="h-16 w-full" />
        ) : count === 0 ? (
          <p className="text-sm font-semibold text-ink">Off</p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line">
            {factors.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <KeyRound className="size-5 text-ink-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{f.friendly_name || "Authenticator app"}</p>
                  <p className="text-xs text-ink-muted">Added {dateFormat.format(new Date(f.created_at))}</p>
                </div>
                {confirmRemove === f.id ? (
                  <span className="flex flex-wrap items-center gap-2 text-sm text-danger-ink">
                    Remove this authenticator?
                    <Button size="sm" variant="destructive" loading={busy} onClick={() => void remove(f.id)}>Remove</Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="tertiary"
                    disabled={mfaRequired && count <= 1}
                    title={mfaRequired && count <= 1 ? "Your account needs at least one authenticator" : undefined}
                    onClick={() => setConfirmRemove(f.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {mfaRequired && count === 1 && <p className="text-xs text-ink-muted">You can't remove your only authenticator. Add another one first.</p>}
        {adding ? (
          <div className="rounded-card border border-line p-4">
            <MfaFlow
              mode="add"
              onDone={async () => {
                setAdding(false);
                await recordSecurityEventAction("account.mfa_enabled");
                setMessage({ tone: "success", text: "Authenticator added." });
                await load();
                router.refresh();
              }}
            />
            <Button variant="tertiary" size="sm" className="mt-3" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" className="w-fit" onClick={() => setAdding(true)}>
            {count === 0 ? "Turn on two-step verification" : "Add another authenticator"}
          </Button>
        )}
      </section>

      <section aria-labelledby="sessions-heading" className="flex flex-col gap-3 border-t border-line pt-6">
        <div className="flex items-center gap-2">
          <LogOut className="size-5 text-brand" aria-hidden="true" />
          <h3 id="sessions-heading" className="font-bold text-ink">Signed-in devices</h3>
        </div>
        <p className="text-sm text-ink-muted">
          If you used a shared or lost device, sign out everywhere else. You'll stay signed in here.
        </p>
        <Button variant="secondary" size="sm" className="w-fit" loading={busy} onClick={() => void signOutOthers()}>
          Sign out of all other devices
        </Button>
      </section>
    </div>
  );
}
