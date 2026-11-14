"use client";

import { useId, useState } from "react";
import { Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BarDatum = { key: string; label: string; short: string; value: number };

const lkr = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 });
const count = new Intl.NumberFormat("en-LK");
const compact = new Intl.NumberFormat("en-LK", { notation: "compact", maximumFractionDigits: 1 });

const FORMATS = {
  lkr: { value: (v: number) => lkr.format(v), axis: (v: number) => (v >= 1000 ? compact.format(v) : count.format(v)) },
  count: { value: (v: number) => count.format(v), axis: (v: number) => count.format(v) },
} as const;

/** Rounds the axis top up to a friendly number and returns evenly spaced ticks. */
function niceTicks(max: number, integer: boolean, steps = 4) {
  if (max <= 0) return [0, 1, 2, 3, 4].slice(0, steps + 1);
  const raw = max / steps;
  const mag = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  if (integer) step = Math.max(1, Math.ceil(step));
  return Array.from({ length: steps + 1 }, (_, i) => i * step);
}

/**
 * Single-series bar chart: one measure, one colour, hover/focus tooltip,
 * sparse axis labels and a table view. Built with HTML so it fits any width.
 */
export function BarChart({
  title,
  data,
  kind,
  emptyText = "Nothing in this period.",
}: {
  title: string;
  data: BarDatum[];
  /** "lkr" for money, "count" for whole numbers. */
  kind: keyof typeof FORMATS;
  emptyText?: string;
}) {
  const format = FORMATS[kind].value;
  const axisFormat = FORMATS[kind].axis;
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)), kind === "count");
  const top = ticks[ticks.length - 1] || 1;
  const total = data.reduce((s, d) => s + d.value, 0);
  // Show at most ~8 x-axis labels.
  const every = Math.max(1, Math.ceil(data.length / 8));
  const current = active !== null ? data[active] : null;

  return (
    <figure className="flex flex-col gap-3" aria-labelledby={`${id}-title`}>
      <figcaption className="flex items-start justify-between gap-3">
        <span>
          <span id={`${id}-title`} className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block text-2xl font-extrabold tabular-nums text-ink">{format(total)}</span>
        </span>
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <Table2 className="size-3.5" aria-hidden="true" /> {table ? "Show chart" : "Show table"}
        </button>
      </figcaption>

      {table ? (
        <div className="max-h-72 overflow-y-auto rounded-control border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs text-ink-muted">
              <tr><th scope="col" className="px-3 py-2 font-semibold">Period</th><th scope="col" className="px-3 py-2 text-right font-semibold">{title}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((d) => (
                <tr key={d.key}><td className="px-3 py-1.5 text-ink">{d.label}</td><td className="px-3 py-1.5 text-right tabular-nums text-ink">{format(d.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : total === 0 ? (
        <p className="flex h-48 items-center justify-center rounded-control bg-canvas text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <div className="flex gap-2">
          {/* Y axis */}
          <div className="relative h-48 w-14 shrink-0 text-right text-[11px] tabular-nums text-ink-muted" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / top) * 100}%` }}>{axisFormat(t)}</span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-48" onMouseLeave={() => setActive(null)}>
              {/* Grid */}
              {ticks.map((t) => (
                <div key={t} className={cn("absolute inset-x-0 h-px", t === 0 ? "bg-ink/25" : "bg-line")} style={{ top: `${100 - (t / top) * 100}%` }} aria-hidden="true" />
              ))}
              {/* Bars */}
              <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label={title}>
                {data.map((d, i) => (
                  <div
                    key={d.key}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${d.label}: ${format(d.value)}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="group relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
                  >
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-t-[4px] transition-colors",
                        active === i ? "bg-brand-hover" : "bg-brand",
                        "group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-1",
                      )}
                      style={{ height: d.value > 0 ? `max(2px, ${(d.value / top) * 100}%)` : 0 }}
                    />
                  </div>
                ))}
              </div>
              {/* Tooltip */}
              {current && active !== null && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-control border border-line bg-surface px-3 py-2 text-xs shadow-float"
                  style={{
                    left: `${((active + 0.5) / data.length) * 100}%`,
                    bottom: `calc(${Math.min(85, (current.value / top) * 100)}% + 8px)`,
                  }}
                  role="status"
                >
                  <span className="block text-ink-muted">{current.label}</span>
                  <span className="block font-bold tabular-nums text-ink">{format(current.value)}</span>
                </div>
              )}
            </div>
            {/* X axis */}
            <div className="mt-1.5 flex gap-[2px] text-[11px] text-ink-muted" aria-hidden="true">
              {data.map((d, i) => (
                <span key={d.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
                  {i % every === 0 ? d.short : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
