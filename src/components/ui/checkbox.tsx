import type { ComponentProps, ReactNode } from "react";

export function Checkbox({ label, hint, name, id, ...props }: ComponentProps<"input"> & { label: string; hint?: ReactNode; name: string }) {
  const inputId = id ?? name;
  return (
    <div className="flex items-start gap-3">
      <input
        id={inputId}
        name={name}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-line accent-[var(--brand-primary)]"
        {...props}
      />
      <div>
        <label htmlFor={inputId} className="cursor-pointer text-sm font-semibold text-ink">{label}</label>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    </div>
  );
}
