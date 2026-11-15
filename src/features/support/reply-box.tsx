"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { replyToTicketAction } from "./actions";

/** Reply box. The team can switch to a private internal note. */
export function ReplyBox({ ticketId, team, closed }: { ticketId: string; team: boolean; closed: boolean }) {
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (closed && !team) {
    return <p className="rounded-tile bg-canvas p-4 text-sm text-ink-muted">This ticket is closed. If you still need help, open a new request.</p>;
  }

  function send() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await replyToTicketAction(ticketId, body, internal);
      if (!res.ok) return setError(res.error);
      setBody("");
      setMessage(res.message ?? null);
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-card border p-4", internal ? "border-dashed border-warning/60 bg-warning-soft" : "border-line bg-surface")}>
      {team && (
        <div role="group" aria-label="Message type" className="flex w-fit rounded-full border border-line bg-surface p-0.5">
          <button type="button" aria-pressed={!internal} onClick={() => setInternal(false)} className={cn("h-8 rounded-full px-3 text-sm font-semibold", !internal ? "bg-ink text-white" : "text-ink")}>
            Reply to learner
          </button>
          <button type="button" aria-pressed={internal} onClick={() => setInternal(true)} className={cn("h-8 rounded-full px-3 text-sm font-semibold", internal ? "bg-ink text-white" : "text-ink")}>
            Internal note
          </button>
        </div>
      )}
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {internal ? "Note for the team (the learner won't see this)" : team ? "Reply" : "Your reply"}
      </label>
      <textarea
        id={id}
        rows={5}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full rounded-control border border-line bg-surface px-3 py-2 text-base text-ink focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30 sm:text-sm"
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {message && <p role="status" className="text-sm font-medium text-success-ink">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          {team && !internal ? "The learner gets a notification. The ticket moves to “Waiting for learner”." : !team ? "We'll reply here and notify you." : ""}
        </p>
        <Button onClick={send} loading={pending} disabled={pending || !body.trim()} variant={internal ? "ink" : "primary"}>
          {internal ? "Add note" : "Send reply"}
        </Button>
      </div>
    </div>
  );
}
