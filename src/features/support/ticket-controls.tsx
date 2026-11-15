"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateTicketAction } from "./actions";

type Opt = { value: string; label: string };

const STATUSES: Opt[] = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "waiting_learner", label: "Waiting for learner" },
  { value: "waiting_internal", label: "Waiting internally" },
  { value: "resolved", label: "Solved" },
  { value: "closed", label: "Closed" },
];
const PRIORITIES: Opt[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function Field({ id, label, value, options, onChange, disabled, hint }: {
  id: string; label: string; value: string; options: Opt[]; onChange: (v: string) => void; disabled?: boolean; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30 disabled:bg-canvas disabled:text-ink-muted"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Status, priority and assignee. Controls you don't have permission for are shown but locked. */
export function TicketControls({
  ticketId, status, priority, assignee, agents, can,
}: {
  ticketId: string; status: string; priority: string; assignee: string | null;
  agents: { id: string; name: string }[];
  can: { reply: boolean; close: boolean; assign: boolean };
}) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [p, setP] = useState(priority);
  const [a, setA] = useState(assignee ?? "none");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const changed = s !== status || p !== priority || a !== (assignee ?? "none");

  const statusOptions = STATUSES.filter((o) => (o.value === "resolved" || o.value === "closed" ? can.close || o.value === status : can.reply || o.value === status));

  function save() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await updateTicketAction(ticketId, {
        status: s !== status ? (s as never) : undefined,
        priority: p !== priority ? (p as never) : undefined,
        assignee: a !== (assignee ?? "none") ? a : undefined,
      });
      if (!res.ok) return setError(res.error);
      setMessage(res.message ?? null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Field id="ticket-status" label="Status" value={s} options={statusOptions} onChange={setS} disabled={!can.reply && !can.close} />
      <Field id="ticket-priority" label="Priority" value={p} options={PRIORITIES} onChange={setP} disabled={!can.assign} />
      <Field
        id="ticket-assignee"
        label="Handled by"
        value={a}
        options={[{ value: "none", label: "Nobody yet" }, ...agents.map((g) => ({ value: g.id, label: g.name }))]}
        onChange={setA}
        disabled={!can.assign}
        hint={!can.assign ? "Ask the Owner for “Assign tickets” to change this." : undefined}
      />
      {error && <Alert tone="danger">{error}</Alert>}
      {message && <p role="status" className="text-sm font-medium text-success-ink">{message}</p>}
      <Button onClick={save} disabled={!changed || pending} loading={pending} variant="secondary">Save changes</Button>
    </div>
  );
}
