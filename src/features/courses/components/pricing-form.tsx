"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import type { Course } from "@/lib/courses/types";
import { cn } from "@/lib/utils";
import { savePricingAction } from "../actions";

export function PricingForm({ course }: { course: Course }) {
  const [state, formAction, pending] = useActionState(savePricingAction, initialFormState);
  const v = state.values;
  const [accessType, setAccessType] = useState<string>(v?.accessType ?? course.access_type);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={course.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Price (LKR)"
          name="price"
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          required
          defaultValue={v?.price ?? (course.price_lkr ?? "").toString()}
          hint="Enter 0 for a free course."
          error={state.fieldErrors?.price?.[0]}
        />
        <Input
          label="Sale price (LKR)"
          name="salePrice"
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          defaultValue={v?.salePrice ?? (course.sale_price_lkr ?? "").toString()}
          hint="Optional. Shown with the regular price crossed out."
          error={state.fieldErrors?.salePrice?.[0]}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-ink">How long learners keep access</legend>
        {[
          { value: "lifetime", label: "Lifetime access", hint: "Learners keep the course for as long as the platform runs." },
          { value: "fixed_days", label: "Fixed period", hint: "Access ends a set number of days after enrolment." },
        ].map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-control border p-4",
              accessType === option.value ? "border-brand bg-brand-soft" : "border-line hover:border-ink-muted/40",
            )}
          >
            <input
              type="radio"
              name="accessType"
              value={option.value}
              checked={accessType === option.value}
              onChange={() => setAccessType(option.value)}
              className="mt-0.5 size-4 accent-[var(--brand-primary)]"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">{option.label}</span>
              <span className="block text-xs text-ink-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {accessType === "fixed_days" && (
        <div className="max-w-xs">
          <Input
            label="Access period (days)"
            name="accessDays"
            type="number"
            min={1}
            max={3650}
            defaultValue={v?.accessDays ?? (course.access_days ?? 365).toString()}
            hint="For example 180 for six months or 365 for a year."
            error={state.fieldErrors?.accessDays?.[0]}
          />
        </div>
      )}

      <div>
        <Button type="submit" loading={pending}>Save pricing</Button>
      </div>
    </form>
  );
}
