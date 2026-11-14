"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import { createCourseAction } from "../actions";

export function CreateCourseForm() {
  const [state, formAction, pending] = useActionState(createCourseAction, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-start" noValidate>
      <div className="flex-1">
        <FormFeedback state={state} />
        <Input
          label="Course title"
          name="title"
          required
          placeholder="e.g. Video editing for reels"
          defaultValue={state.values?.title}
          error={state.fieldErrors?.title?.[0]}
          hint="You can change it later. The course starts as a private draft."
        />
      </div>
      <Button type="submit" loading={pending} className="sm:mt-[26px]">Create draft</Button>
    </form>
  );
}
