import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
  /** Rendered on the right of the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
};

export function Input({ label, name, id, hint, error, labelAction, className, required, ...props }: InputProps) {
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-danger-ink" aria-hidden="true"> *</span>}
        </label>
        {labelAction}
      </div>
      <input
        id={inputId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "h-11 w-full rounded-control border bg-surface px-3 text-base text-ink placeholder:text-ink-muted/70 sm:text-sm",
          "transition-colors focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand/30",
          "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-muted",
          error ? "border-danger" : "border-line hover:border-ink-muted/40",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger-ink">{error}</p>
      )}
    </div>
  );
}
