import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea"> & {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
};

export function Textarea({ label, name, id, hint, error, className, required, rows = 4, ...props }: TextareaProps) {
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-danger-ink" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={inputId}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "w-full rounded-control border bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-muted/70 sm:text-sm",
          "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand/30",
          error ? "border-danger" : "border-line hover:border-ink-muted/40",
          className,
        )}
        {...props}
      />
      {hint && !error && <p id={hintId} className="text-xs text-ink-muted">{hint}</p>}
      {error && <p id={errorId} className="text-xs font-medium text-danger-ink">{error}</p>}
    </div>
  );
}
