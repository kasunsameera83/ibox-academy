"use client";

import { useRef, type ReactNode } from "react";
import { Button, type ButtonStyleProps } from "./button";
import { SubmitButton } from "./submit-button";

/**
 * A button that opens a confirmation dialog before submitting a server action.
 * Follows the blueprint's destructive-action pattern: target, consequence, explicit verb.
 */
export function ConfirmForm({
  action,
  fields,
  trigger,
  triggerVariant = "secondary",
  title,
  body,
  confirmLabel,
  confirmVariant = "primary",
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  trigger: ReactNode;
  triggerVariant?: ButtonStyleProps["variant"];
  title: string;
  body: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonStyleProps["variant"];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button variant={triggerVariant} size="sm" onClick={() => dialogRef.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 shadow-float"
      >
        <form action={action} className="flex flex-col gap-4 p-6">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id="confirm-title" className="text-lg font-bold text-ink">{title}</h2>
          <div className="text-sm text-ink-muted">{body}</div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>Cancel</Button>
            <SubmitButton variant={confirmVariant}>{confirmLabel}</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
