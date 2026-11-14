"use client";

import { ShieldAlert } from "lucide-react";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

/** Ready-made bundles for common jobs. The Owner can still tick boxes one by one. */
export const PRESETS: { label: string; keys: PermissionKey[] }[] = [
  { label: "Content editor", keys: ["courses.read", "courses.create", "courses.edit", "courses.upload", "courses.submit_review"] },
  { label: "Finance", keys: ["orders.read", "payments.read", "payments.verify_bank_transfer", "refunds.request"] },
  { label: "Learner support", keys: ["students.read", "students.update_limited", "orders.read", "tickets.read", "tickets.reply"] },
];

const GROUPS = Object.entries(PERMISSIONS).reduce<Record<string, { key: PermissionKey; label: string; sensitive: boolean }[]>>((acc, [key, def]) => {
  const d = def as { group: string; label: string; sensitive?: boolean };
  (acc[d.group] ??= []).push({ key: key as PermissionKey, label: d.label, sensitive: Boolean(d.sensitive) });
  return acc;
}, {});

export function PermissionPicker({ value, onChange, idPrefix }: { value: string[]; onChange: (keys: string[]) => void; idPrefix: string }) {
  const selected = new Set(value);
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next].sort());
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink-muted">Quick start:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange([...new Set([...value, ...p.keys])].sort())}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink hover:border-brand hover:bg-brand-soft"
          >
            + {p.label}
          </button>
        ))}
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-ink-muted hover:text-ink hover:underline">
            Clear all
          </button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(GROUPS).map(([group, items]) => (
          <fieldset key={group} className="rounded-control border border-line p-3">
            <legend className="px-1 text-xs font-bold text-ink">{group}</legend>
            <div className="flex flex-col gap-1.5">
              {items.map((item) => {
                const id = `${idPrefix}-${item.key}`;
                return (
                  <label key={item.key} htmlFor={id} className={cn("flex cursor-pointer items-center gap-2 text-sm", selected.has(item.key) ? "text-ink" : "text-ink-muted")}>
                    <input id={id} type="checkbox" checked={selected.has(item.key)} onChange={() => toggle(item.key)} className="size-4 accent-[var(--color-brand)]" />
                    <span className="flex-1">{item.label}</span>
                    {item.sensitive && <ShieldAlert className="size-3.5 text-warning-ink" aria-label="Sensitive" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <ShieldAlert className="size-3.5 text-warning-ink" aria-hidden="true" /> Sensitive: only give these to people you trust with money or learner accounts.
      </p>
    </div>
  );
}
