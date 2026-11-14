"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareWarning } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewAssignmentAction } from "./actions";

export function ReviewForm({
  submissionId,
  initialFeedback,
  reviewed,
  nextHref,
}: {
  submissionId: string;
  initialFeedback: string | null;
  reviewed: boolean;
  /** Where to go after saving: the next submission in the queue, or the list. */
  nextHref: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<"approve" | "changes" | null>(null);

  function save(approve: boolean) {
    setError(null);
    setWhich(approve ? "approve" : "changes");
    start(async () => {
      const res = await reviewAssignmentAction({ id: submissionId, approve, feedback });
      if (!res.ok) return setError(res.error);
      router.push(nextHref);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        label="Feedback for the learner"
        name="feedback"
        rows={6}
        maxLength={5000}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        hint="Optional when approving. Needed when you ask for changes. The learner sees this with an alert."
      />
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save(true)} loading={pending && which === "approve"} disabled={pending} className="rounded-full">
          <CheckCircle2 className="size-4" aria-hidden="true" /> {reviewed ? "Save as approved" : "Approve"}
        </Button>
        <Button variant="secondary" onClick={() => save(false)} loading={pending && which === "changes"} disabled={pending} className="rounded-full">
          <MessageSquareWarning className="size-4" aria-hidden="true" /> Request changes
        </Button>
      </div>
      <p className="text-xs text-ink-muted">Requesting changes reopens the lesson, so the learner needs to resubmit to complete it.</p>
    </div>
  );
}
