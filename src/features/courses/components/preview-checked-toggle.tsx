"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPreviewCheckedAction } from "../lesson-actions";

export function PreviewCheckedToggle({ courseId, checked }: { courseId: string; checked: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              const r = await markPreviewCheckedAction(courseId, next);
              if (!r.ok) setError(r.error);
              router.refresh();
            });
          }}
          className="mt-0.5 size-5 accent-[var(--brand-primary)]"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">I've checked the learner preview</span>
          <span className="block text-xs text-ink-muted">Course page, curriculum and free previews look right on a phone and a computer.</span>
        </span>
      </label>
      {error && <p className="mt-1 text-xs font-medium text-danger-ink">{error}</p>}
    </div>
  );
}
