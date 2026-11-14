"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/forms";
import type { Course } from "@/lib/courses/types";
import { saveSeoAction } from "../actions";

export function SeoForm({ course }: { course: Course }) {
  const [state, formAction, pending] = useActionState(saveSeoAction, initialFormState);
  const v = state.values;
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={course.id} />
      <Input
        label="Search title"
        name="seoTitle"
        maxLength={70}
        defaultValue={v?.seoTitle ?? course.seo_title ?? ""}
        placeholder={course.title}
        hint="Shown in Google results. Up to 70 characters. Leave empty to use the course title."
        error={state.fieldErrors?.seoTitle?.[0]}
      />
      <Textarea
        label="Search description"
        name="seoDescription"
        rows={3}
        maxLength={170}
        defaultValue={v?.seoDescription ?? course.seo_description ?? ""}
        placeholder={course.subtitle ?? ""}
        hint="Up to 170 characters. Leave empty to use the short description."
        error={state.fieldErrors?.seoDescription?.[0]}
      />
      <div>
        <Button type="submit" loading={pending}>Save SEO</Button>
      </div>
    </form>
  );
}
