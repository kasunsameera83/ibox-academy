"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button, type ButtonStyleProps } from "@/components/ui/button";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Trigger button + confirmation dialog for an action that returns a result.
 * Shows what will happen, an optional reason field, and the outcome.
 */
export function ActionDialog({
  trigger,
  triggerVariant = "secondary",
  triggerSize = "sm",
  title,
  body,
  confirmLabel,
  confirmVariant = "primary",
  reasonLabel,
  run,
  children,
}: {
  trigger: ReactNode;
  triggerVariant?: ButtonStyleProps["variant"];
  triggerSize?: ButtonStyleProps["size"];
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonStyleProps["variant"];
  /** Shows an optional "reason" box, saved to the audit log. */
  reasonLabel?: string;
  run: (reason: string) => Promise<Result>;
  /** Extra fields rendered inside the dialog (controlled by the parent). */
  children?: ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    setError(null);
    start(async () => {
      const res = await run(reason);
      if (!res.ok) return setError(res.error);
      ref.current?.close();
      setReason("");
      setMessage(res.message ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        className="rounded-full"
        onClick={() => {
          setError(null);
          setMessage(null);
          ref.current?.showModal();
        }}
      >
        {trigger}
      </Button>
      {message && <p role="status" className="basis-full text-xs font-medium text-success-ink">{message}</p>}
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[min(460px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          {body && <div className="text-sm text-ink-muted">{body}</div>}
          {children}
          {reasonLabel && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {reasonLabel}
              <textarea
                value={reason}
                maxLength={500}
                rows={3}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-control border border-line px-3 py-2 text-sm font-normal"
              />
              <span className="text-xs font-normal text-ink-muted">Optional. Saved to the audit log, not shown to the person.</span>
            </label>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => ref.current?.close()} disabled={pending}>Cancel</Button>
            <Button variant={confirmVariant} onClick={confirm} loading={pending}>{confirmLabel}</Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
