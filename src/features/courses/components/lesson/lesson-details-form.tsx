"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LESSON_TYPES } from "@/lib/courses/lessons";
import type { Lesson } from "@/lib/courses/types";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { saveLessonDetailsAction } from "../../lesson-actions";

export function LessonDetailsForm({
  courseId,
  lesson,
  sections,
  missing,
}: {
  courseId: string;
  lesson: Lesson;
  sections: { id: string; title: string }[];
  missing: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveLessonDetailsAction, initialFormState);
  const v = state.values;
  const [status, setStatus] = useState<string>(v?.status ?? lesson.status);
  const previewable = LESSON_TYPES[lesson.type].previewable;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />
      <Input label="Lesson title" name="title" required maxLength={160} defaultValue={v?.title ?? lesson.title} error={state.fieldErrors?.title?.[0]} />
      <Textarea
        label="Description"
        name="description"
        rows={4}
        maxLength={5000}
        defaultValue={v?.description ?? lesson.description ?? ""}
        hint="A short introduction shown above the lesson content."
        error={state.fieldErrors?.description?.[0]}
      />
      <Select
        label="Section"
        name="sectionId"
        defaultValue={v?.sectionId ?? lesson.section_id}
        options={sections.map((s, i) => ({ value: s.id, label: `Section ${i + 1} — ${s.title}` }))}
        error={state.fieldErrors?.sectionId?.[0]}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Visibility</legend>
        {[
          { value: "draft", label: "Draft", hint: "Hidden from learners while you work on it." },
          { value: "published", label: "Published", hint: "Visible to enrolled learners once the course is live." },
        ].map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-control border p-3",
              status === o.value ? "border-brand bg-brand-soft" : "border-line hover:border-ink-muted/40",
            )}
          >
            <input type="radio" name="status" value={o.value} checked={status === o.value} onChange={() => setStatus(o.value)} className="mt-0.5 size-4 accent-[var(--brand-primary)]" />
            <span>
              <span className="block text-sm font-semibold text-ink">{o.label}</span>
              <span className="block text-xs text-ink-muted">{o.hint}</span>
            </span>
          </label>
        ))}
        {missing && status === "published" && (
          <p className="text-xs font-medium text-warning-ink">This lesson will show as Pending until it's complete: {missing.toLowerCase()}.</p>
        )}
      </fieldset>

      {previewable ? (
        <Checkbox
          label="Free preview"
          name="isPreview"
          defaultChecked={lesson.is_preview}
          hint="Anyone can watch or read this lesson on the course page before buying."
        />
      ) : (
        <p className="text-xs text-ink-muted">{LESSON_TYPES[lesson.type].label}s can't be free previews.</p>
      )}

      <div>
        <Button type="submit" loading={pending}>Save lesson</Button>
      </div>
    </form>
  );
}
