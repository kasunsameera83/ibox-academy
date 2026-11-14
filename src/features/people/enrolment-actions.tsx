"use client";

import { useState } from "react";
import { CalendarClock, RotateCcw, XCircle } from "lucide-react";
import { updateEnrolmentAction } from "./actions";
import { ActionDialog } from "./action-dialog";

export function EnrolmentActions({
  enrolmentId,
  studentId,
  courseTitle,
  status,
  expiresAt,
}: {
  enrolmentId: string;
  studentId: string;
  courseTitle: string;
  status: "active" | "revoked" | "expired";
  expiresAt: string | null;
}) {
  const current = expiresAt ? new Date(expiresAt).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }) : "";
  const [until, setUntil] = useState(current);
  const [lifetime, setLifetime] = useState(!expiresAt);
  const today = new Date().toISOString().slice(0, 10);
  const expired = status === "expired" || (expiresAt !== null && new Date(expiresAt) < new Date());

  const dateFields = (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-ink">Access</legend>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="radio" checked={lifetime} onChange={() => setLifetime(true)} className="accent-[var(--color-brand)]" /> Lifetime
      </label>
      <label className="flex flex-wrap items-center gap-2 text-sm text-ink">
        <input type="radio" checked={!lifetime} onChange={() => setLifetime(false)} className="accent-[var(--color-brand)]" /> Until
        <input
          type="date"
          min={today}
          value={until}
          onChange={(e) => {
            setUntil(e.target.value);
            setLifetime(false);
          }}
          aria-label="Last day of access"
          className="h-9 rounded-control border border-line px-2 text-sm"
        />
      </label>
    </fieldset>
  );

  const save = () =>
    lifetime || until
      ? updateEnrolmentAction({ enrolmentId, studentId, status: "active", until: lifetime ? "" : until })
      : Promise.resolve({ ok: false as const, error: "Choose the last day of access, or pick lifetime access." });

  if (status === "revoked" || expired) {
    return (
      <ActionDialog
        trigger={<><RotateCcw className="size-4" aria-hidden="true" /> Restore</>}
        title={`Restore access to “${courseTitle}”?`}
        body="Their progress, quiz scores and certificate are still there."
        confirmLabel="Restore access"
        run={save}
      >
        {dateFields}
      </ActionDialog>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ActionDialog
        trigger={<><CalendarClock className="size-4" aria-hidden="true" /> Change end date</>}
        triggerVariant="tertiary"
        title={`Access to “${courseTitle}”`}
        confirmLabel="Save"
        run={save}
      >
        {dateFields}
      </ActionDialog>
      <ActionDialog
        trigger={<><XCircle className="size-4" aria-hidden="true" /> Remove access</>}
        triggerVariant="tertiary"
        title={`Remove access to “${courseTitle}”?`}
        body="They can't open this course any more. Progress and certificates are kept, and you can restore access later. This doesn't refund any payment."
        confirmLabel="Remove access"
        confirmVariant="destructive"
        run={() => updateEnrolmentAction({ enrolmentId, studentId, status: "revoked", until: "" })}
      />
    </div>
  );
}
