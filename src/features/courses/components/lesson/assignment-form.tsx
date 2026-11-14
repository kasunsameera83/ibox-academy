"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Lesson } from "@/lib/courses/types";
import { initialFormState } from "@/lib/forms";
import { saveLessonBodyAction } from "../../lesson-actions";

export function AssignmentForm({ courseId, lesson }: { courseId: string; lesson: Lesson }) {
  const [state, formAction, pending] = useActionState(saveLessonBodyAction, initialFormState);
  const submission = lesson.settings.submission ?? ["text", "file"];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />
      <Textarea
        label="Instructions"
        name="body"
        rows={12}
        defaultValue={state.values?.body ?? lesson.body ?? ""}
        hint="Explain the task, what a good submission looks like and how it will be reviewed."
        error={state.fieldErrors?.body?.[0]}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-ink">How learners submit</legend>
        <Checkbox label="Written answer" name="submit_text" defaultChecked={submission.includes("text")} />
        <Checkbox label="File upload" name="submit_file" defaultChecked={submission.includes("file")} hint="PDF, image, document or ZIP." />
        {state.fieldErrors?.submission?.[0] && <p className="text-xs font-medium text-danger-ink">{state.fieldErrors.submission[0]}</p>}
      </fieldset>
      <div className="max-w-xs">
        <Input
          label="Maximum file size (MB)"
          name="maxFileMb"
          type="number"
          min={1}
          max={100}
          defaultValue={String(lesson.settings.maxFileMb ?? 20)}
          error={state.fieldErrors?.maxFileMb?.[0]}
        />
      </div>
      <div>
        <Button type="submit" loading={pending}>Save assignment</Button>
      </div>
    </form>
  );
}
