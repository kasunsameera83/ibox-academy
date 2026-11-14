"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuItem =
  | { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean; icon?: ReactNode }
  | { separator: true };

/** Accessible overflow menu: Escape and outside-click close it; arrow keys move focus. */
export function Menu({ label, items, align = "right" }: { label: string; items: MenuItem[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKey(e: ReactKeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const nodes = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);
    const i = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (i + 1) % nodes.length : (i - 1 + nodes.length) % nodes.length;
    nodes[next]?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-ink"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            "absolute top-10 z-30 min-w-52 rounded-card border border-line bg-surface p-1.5 shadow-float",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) =>
            "separator" in item ? (
              <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
                  item.danger ? "text-danger-ink hover:bg-danger-soft" : "text-ink hover:bg-canvas",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
