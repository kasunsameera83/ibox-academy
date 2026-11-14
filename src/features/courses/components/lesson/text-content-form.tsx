"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { estimateReadingMinutes } from "@/lib/courses/lessons";
import type { Lesson } from "@/lib/courses/types";
import { initialFormState } from "@/lib/forms";
import { saveLessonBodyAction } from "../../lesson-actions";

export function TextContentForm({ courseId, lesson }: { courseId: string; lesson: Lesson }) {
  const [state, formAction, pending] = useActionState(saveLessonBodyAction, initialFormState);
  const [body, setBody] = useState(state.values?.body ?? lesson.body ?? "");
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const estimate = estimateReadingMinutes(body);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />
      <Textarea
        label="Lesson content"
        name="body"
        rows={18}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="leading-relaxed"
        hint={
          <>
            Start a line with <code className="rounded bg-canvas px-1"># </code> for a heading and <code className="rounded bg-canvas px-1">- </code> for a bullet. Leave a blank line between paragraphs.
          </>
        }
        error={state.fieldErrors?.body?.[0]}
      />
      <p className="text-xs text-ink-muted" aria-live="polite">
        {words} word{words === 1 ? "" : "s"}, about {estimate} min read
      </p>
      <div className="max-w-xs">
        <Input
          label="Reading time (minutes)"
          name="readingMinutes"
          type="number"
          min={0}
          max={600}
          defaultValue={state.values?.readingMinutes ?? (lesson.reading_minutes !== null && lesson.reading_minutes !== estimateReadingMinutes(lesson.body) ? String(lesson.reading_minutes) : "")}
          placeholder={String(estimate)}
          hint="Leave empty to calculate it automatically."
          error={state.fieldErrors?.readingMinutes?.[0]}
        />
      </div>
      <div>
        <Button type="submit" loading={pending}>Save content</Button>
      </div>
    </form>
  );
}
