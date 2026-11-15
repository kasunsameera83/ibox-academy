"use client";

import { useId, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-control border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-muted/70 sm:text-sm " +
  "transition-colors hover:border-ink-muted/40 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand/30 " +
  "disabled:cursor-not-allowed disabled:bg-canvas";

/** Character guidance: count turns amber near the limit (blueprint: "content fields with character guidance"). */
function Counter({ value, max }: { value: string; max: number }) {
  const n = value.length;
  return (
    <span className={cn("text-xs tabular-nums", n > max ? "font-semibold text-danger-ink" : n > max * 0.85 ? "text-warning-ink" : "text-ink-muted")}>
      {n}/{max}
    </span>
  );
}

function Label({ htmlFor, children, right }: { htmlFor: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">{children}</label>
      {right}
    </div>
  );
}

export function TextField({
  label, value, onChange, max, hint, placeholder, disabled, required,
}: {
  label: string; value: string; onChange: (v: string) => void; max: number; hint?: ReactNode; placeholder?: string; disabled?: boolean; required?: boolean;
}) {
  const id = useId();
  const empty = required && value.trim() === "";
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} right={<Counter value={value} max={max} />}>
        {label}{required && <span className="text-danger-ink" aria-hidden="true"> *</span>}
      </Label>
      <input
        id={id}
        className={cn(control, "h-10", empty && "border-danger")}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={empty || value.length > max || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {empty ? <p className="text-xs font-medium text-danger-ink">Required.</p> : hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function AreaField({
  label, value, onChange, max, hint, rows = 3, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; max: number; hint?: ReactNode; rows?: number; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} right={<Counter value={value} max={max} />}>{label}</Label>
      <textarea id={id} rows={rows} className={cn(control, "py-2")} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50",
          checked ? "bg-brand" : "bg-ink/20",
        )}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function SelectField<T extends string>({
  label, value, options, onChange, disabled,
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={cn(control, "h-10")} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export type LinkValue = { label: string; href: string } | null;

/** Button text + destination, or none. */
export function LinkField({ label, value, onChange, disabled, optional = true }: {
  label: string; value: LinkValue; onChange: (v: LinkValue) => void; disabled?: boolean; optional?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-tile border border-line p-3">
      <legend className="px-1 text-sm font-semibold text-ink">{label}</legend>
      {optional && (
        <Toggle label="Show this button" checked={value !== null} disabled={disabled} onChange={(on) => onChange(on ? { label: "Browse courses", href: "/courses" } : null)} />
      )}
      {value && (
        <>
          <TextField label="Button text" value={value.label} max={40} required disabled={disabled} onChange={(v) => onChange({ ...value, label: v })} />
          <TextField
            label="Goes to"
            value={value.href}
            max={300}
            required
            disabled={disabled}
            placeholder="/courses"
            hint="A page on this site (/courses), a section (#how-it-works), or a full https:// link."
            onChange={(v) => onChange({ ...value, href: v })}
          />
        </>
      )}
    </fieldset>
  );
}

/** Moves an item in a list; used by every repeater. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** A list of items with add, remove and reorder. */
export function Repeater<T>({
  label, items, onChange, render, create, max, itemLabel, disabled, min = 0,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (item: T) => void, index: number) => ReactNode;
  create: () => T;
  max: number;
  min?: number;
  itemLabel: (item: T, index: number) => string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex w-full items-baseline justify-between text-sm font-semibold text-ink">
        {label} <span className="text-xs font-normal text-ink-muted">{items.length}/{max}</span>
      </legend>
      {items.map((item, i) => (
        <div key={i} className="rounded-tile border border-line bg-canvas/60 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">{itemLabel(item, i)}</p>
            <div className="flex shrink-0 items-center gap-0.5">
              <IconBtn label="Move up" disabled={disabled || i === 0} onClick={() => onChange(move(items, i, i - 1))}><ArrowUp className="size-4" /></IconBtn>
              <IconBtn label="Move down" disabled={disabled || i === items.length - 1} onClick={() => onChange(move(items, i, i + 1))}><ArrowDown className="size-4" /></IconBtn>
              <IconBtn label="Remove" disabled={disabled || items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="size-4" /></IconBtn>
            </div>
          </div>
          <div className="flex flex-col gap-3">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...items, create()])}
          className="inline-flex items-center justify-center gap-1.5 rounded-tile border border-dashed border-ink/25 py-2.5 text-sm font-semibold text-ink hover:border-ink/50 hover:bg-canvas disabled:opacity-50"
        >
          <Plus className="size-4" /> Add
        </button>
      )}
    </fieldset>
  );
}

export function IconBtn({ label, children, onClick, disabled, className }: {
  label: string; children: ReactNode; onClick: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** One line per item, for short lists like reassurance points or topics. */
export function LinesField({ label, value, onChange, max, maxItems, hint, disabled }: {
  label: string; value: string[]; onChange: (v: string[]) => void; max: number; maxItems: number; hint?: string; disabled?: boolean;
}) {
  const id = useId();
  const text = value.join("\n");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} right={<span className="text-xs text-ink-muted">{value.filter(Boolean).length}/{maxItems}</span>}>{label}</Label>
      <textarea
        id={id}
        rows={Math.min(Math.max(value.length + 1, 3), 10)}
        className={cn(control, "py-2")}
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.split("\n").slice(0, maxItems).map((l) => l.slice(0, max)))}
      />
      <p className="text-xs text-ink-muted">{hint ?? "One per line."} Up to {max} characters each.</p>
    </div>
  );
}
