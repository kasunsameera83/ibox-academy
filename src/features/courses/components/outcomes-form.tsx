"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/forms";
import type { Course } from "@/lib/courses/types";
import { saveOutcomesAction } from "../actions";

export function OutcomesForm({ course }: { course: Course }) {
  const [state, formAction, pending] = useActionState(saveOutcomesAction, initialFormState);
  const v = state.values;
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={course.id} />
      <Textarea
        label="What learners will be able to do"
        name="outcomes"
        rows={6}
        defaultValue={v?.outcomes ?? course.outcomes.join("\n")}
        hint="One per line, starting with a verb: “Edit a 60-second reel from raw clips”. Aim for 4–8."
        error={state.fieldErrors?.outcomes?.[0]}
      />
      <Textarea
        label="Who this course is for"
        name="audience"
        rows={4}
        defaultValue={v?.audience ?? course.audience.join("\n")}
        hint="One per line."
        error={state.fieldErrors?.audience?.[0]}
      />
      <Textarea
        label="What learners need before starting"
        name="prerequisites"
        rows={3}
        defaultValue={v?.prerequisites ?? course.prerequisites.join("\n")}
        hint="One per line, including tools or software. Leave empty if there are none."
        error={state.fieldErrors?.prerequisites?.[0]}
      />
      <div>
        <Button type="submit" loading={pending}>Save outcomes</Button>
      </div>
    </form>
  );
}
