"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLessonCompleteAction } from "./actions";

/** Mark a video, text or resource lesson as done (or undo it). */
export function CompleteButton({ lessonId, slug, completed }: { lessonId: string; slug: string; completed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    start(async () => {
      const res = await setLessonCompleteAction(lessonId, slug, !completed);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {completed ? (
        <Button variant="secondary" onClick={toggle} loading={pending} className="rounded-full" aria-pressed="true">
          <CircleCheckBig className="size-4 text-success-ink" aria-hidden="true" /> Completed
          <span className="sr-only">. Select to mark as not complete.</span>
        </Button>
      ) : (
        <Button onClick={toggle} loading={pending} className="rounded-full" aria-pressed="false">
          <Check className="size-4" aria-hidden="true" /> Mark as complete
        </Button>
      )}
      {error && <p role="alert" className="text-xs font-medium text-danger-ink">{error}</p>}
    </div>
  );
}
