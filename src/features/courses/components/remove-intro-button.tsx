"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeIntroAction } from "../video-actions";

export function RemoveIntroButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button variant="tertiary" size="sm" className="w-fit" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden="true" /> Remove intro video
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-danger-ink" role="alert">
      Remove the intro video? It's deleted from video hosting.
      <Button
        variant="destructive"
        size="sm"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await removeIntroAction(courseId);
            if (!r.ok) setError(r.error ?? "Couldn't remove it.");
            else setConfirming(false);
            router.refresh();
          })
        }
      >
        Remove
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
      {error && <span className="w-full text-xs">{error}</span>}
    </div>
  );
}
