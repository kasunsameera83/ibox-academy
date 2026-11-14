"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Coupon } from "@/lib/dal/promotions";
import { cn } from "@/lib/utils";
import { saveCouponAction, type CouponInput } from "./actions";

const toDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }) : "");

function suggestCode() {
  const words = ["LEARN", "SKILL", "LEVELUP", "START", "BOOST"];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(10 + Math.random() * 90)}`;
}

const field = "h-11 w-full rounded-control border border-line bg-surface px-3 text-sm";

export function CouponForm({ coupon, courses }: { coupon?: Coupon; courses: { id: string; title: string; status: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState<CouponInput>({
    id: coupon?.id,
    code: coupon?.code ?? "",
    description: coupon?.description ?? "",
    discountType: coupon?.discount_type ?? "percent",
    discountValue: coupon ? String(coupon.discount_value) : "20",
    startsOn: toDay(coupon?.starts_at ?? null),
    endsOn: toDay(coupon?.ends_at ?? null),
    maxRedemptions: coupon?.max_redemptions ? String(coupon.max_redemptions) : "",
    perLearnerLimit: coupon?.per_learner_limit ?? 1,
    appliesToAll: coupon?.applies_to_all ?? true,
    courseIds: coupon?.course_ids ?? [],
  });
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof CouponInput>(k: K, value: CouponInput[K]) => setV((s) => ({ ...s, [k]: value }));
  const invalid = (f: string) => error?.field === f;

  function save() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await saveCouponAction(v);
      if (!res.ok) return setError({ text: res.error, field: res.field });
      if (!coupon && res.id) return router.push(`/app/owner/promotions/${res.id}?created=1`);
      setMessage(res.message ?? "Saved.");
      router.refresh();
    });
  }

  const selected = new Set(v.courseIds);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Code
          <span className="flex gap-2">
            <input
              value={v.code}
              maxLength={30}
              onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              placeholder="LAUNCH20"
              aria-invalid={invalid("code")}
              className={cn(field, "font-mono uppercase tracking-wide", invalid("code") && "border-danger")}
            />
            {!coupon && (
              <Button type="button" variant="secondary" onClick={() => set("code", suggestCode())}>Suggest</Button>
            )}
          </span>
          <span className="text-xs font-normal text-ink-muted">What learners type at checkout. Letters, numbers, - and _.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Note for you
          <input value={v.description} maxLength={200} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Instagram launch post" className={field} />
          <span className="text-xs font-normal text-ink-muted">Only you and your team see this.</span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Discount</legend>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-control border border-line p-0.5" role="radiogroup" aria-label="Discount type">
            {(["percent", "fixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={v.discountType === t}
                onClick={() => set("discountType", t)}
                className={cn("rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-semibold", v.discountType === t ? "bg-brand text-on-brand" : "text-ink-muted hover:text-ink")}
              >
                {t === "percent" ? "Percentage" : "Fixed amount"}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-2">
            {v.discountType === "fixed" && <span className="text-sm text-ink-muted">LKR</span>}
            <input
              type="number"
              min={1}
              max={v.discountType === "percent" ? 100 : undefined}
              step={v.discountType === "percent" ? 1 : 50}
              value={String(v.discountValue)}
              onChange={(e) => set("discountValue", e.target.value)}
              aria-label="Discount"
              aria-invalid={invalid("discountValue")}
              className={cn(field, "w-28", invalid("discountValue") && "border-danger")}
            />
            {v.discountType === "percent" && <span className="text-sm text-ink-muted">% off</span>}
          </span>
        </div>
        <p className="text-xs text-ink-muted">100% gives the course for free. Discounts apply to the current price, including sale prices.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Courses</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" checked={v.appliesToAll} onChange={() => set("appliesToAll", true)} className="accent-[var(--color-brand)]" /> All courses
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" checked={!v.appliesToAll} onChange={() => set("appliesToAll", false)} className="accent-[var(--color-brand)]" /> Only these courses
        </label>
        {!v.appliesToAll && (
          <div className={cn("max-h-56 overflow-y-auto rounded-control border p-2", invalid("courseIds") ? "border-danger" : "border-line")}>
            {courses.length === 0 && <p className="p-2 text-sm text-ink-muted">No courses yet.</p>}
            {courses.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-sm text-ink hover:bg-canvas">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    set("courseIds", [...next]);
                  }}
                  className="size-4 accent-[var(--color-brand)]"
                />
                <span className="flex-1">{c.title}</span>
                {c.status !== "published" && <span className="text-xs text-ink-muted">{c.status.replace("_", " ")}</span>}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Starts
          <input type="date" value={v.startsOn} onChange={(e) => set("startsOn", e.target.value)} className={field} />
          <span className="text-xs font-normal text-ink-muted">Leave empty to start now.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Ends
          <input type="date" value={v.endsOn} min={v.startsOn || undefined} onChange={(e) => set("endsOn", e.target.value)} aria-invalid={invalid("endsOn")} className={cn(field, invalid("endsOn") && "border-danger")} />
          <span className="text-xs font-normal text-ink-muted">Last day it works (Sri Lanka time). Empty means no end date.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Total uses
          <input type="number" min={1} value={v.maxRedemptions} onChange={(e) => set("maxRedemptions", e.target.value)} placeholder="No limit" aria-invalid={invalid("maxRedemptions")} className={cn(field, invalid("maxRedemptions") && "border-danger")} />
          <span className="text-xs font-normal text-ink-muted">e.g. 50 for &ldquo;first 50 learners&rdquo;.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Uses per learner
          <input type="number" min={1} max={100} value={String(v.perLearnerLimit)} onChange={(e) => set("perLearnerLimit", Number(e.target.value) || 1)} className={field} />
          <span className="text-xs font-normal text-ink-muted">How many courses one person can buy with it.</span>
        </label>
      </div>

      {error && <Alert tone="danger">{error.text}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <Button onClick={save} loading={pending} className="w-fit rounded-full">{coupon ? "Save changes" : "Create code"}</Button>
    </div>
  );
}
