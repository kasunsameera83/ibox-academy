"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Captions, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import type { BunnyCaption } from "@/lib/bunny";
import { initialFormState } from "@/lib/forms";
import { deleteCaptionAction, uploadCaptionAction } from "../../lesson-actions";

export function CaptionsManager({ courseId, lessonId, captions }: { courseId: string; lessonId: string; captions: BunnyCaption[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(uploadCaptionAction, initialFormState);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {captions.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {captions.map((c) => (
            <li key={c.srclang} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-sm font-medium text-ink">
              <Captions className="size-4 text-brand" aria-hidden="true" /> {c.label}
              <button
                type="button"
                aria-label={`Remove ${c.label} captions`}
                className="flex size-7 items-center justify-center rounded-full text-ink-muted hover:bg-danger-soft hover:text-danger-ink"
                onClick={async () => {
                  setError(null);
                  const r = await deleteCaptionAction(courseId, lessonId, c.srclang);
                  if (!r.ok) setError(r.error);
                  startTransition(() => router.refresh());
                }}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">No captions yet. Captions help learners on mute and anyone hard of hearing.</p>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end" encType="multipart/form-data">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />
        <div className="sm:w-44">
          <Select
            label="Language"
            name="srclang"
            defaultValue="en"
            options={[
              { value: "en", label: "English" },
              { value: "si", label: "Sinhala" },
              { value: "ta", label: "Tamil" },
            ]}
            error={state.fieldErrors?.srclang?.[0]}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="caption-file" className="text-sm font-semibold text-ink">Caption file</label>
          <input id="caption-file" name="file" type="file" accept=".vtt,.srt" className="text-sm file:mr-3 file:h-10 file:rounded-control file:border file:border-line file:bg-surface file:px-3 file:text-sm file:font-semibold" />
          {state.fieldErrors?.file?.[0] && <p className="text-xs font-medium text-danger-ink">{state.fieldErrors.file[0]}</p>}
        </div>
        <Button type="submit" size="sm" className="h-10" loading={pending}>Upload captions</Button>
      </form>
      <FormFeedback state={state} />
    </div>
  );
}
