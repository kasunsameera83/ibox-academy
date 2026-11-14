"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { grantAccessAction } from "./actions";

export function GrantAccessForm({ studentId, courses }: { studentId: string; courses: { id: string; title: string; status: string; enrolled: boolean }[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [lifetime, setLifetime] = useState(true);
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function submit() {
    setError(null);
    setMessage(null);
    if (!courseId) return setError("Choose a course.");
    if (!lifetime && !until) return setError("Choose the last day of access, or pick lifetime access.");
    start(async () => {
      const res = await grantAccessAction({ studentId, courseId, until: lifetime ? "" : until, note });
      if (!res.ok) return setError(res.error);
      setMessage(res.message ?? "Access given.");
      setCourseId("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Course
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-11 rounded-control border border-line bg-surface px-3 text-sm font-normal">
          <option value="">Choose a course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
              {c.status !== "published" ? ` (${c.status.replace("_", " ")})` : ""}
              {c.enrolled ? " · already has access" : ""}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Access</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" checked={lifetime} onChange={() => setLifetime(true)} className="accent-[var(--color-brand)]" /> Lifetime
        </label>
        <label className="flex flex-wrap items-center gap-2 text-sm text-ink">
          <input type="radio" checked={!lifetime} onChange={() => setLifetime(false)} className="accent-[var(--color-brand)]" /> Until
          <input
            type="date"
            min={today}
            value={until}
            onChange={(e) => {
              setUntil(e.target.value);
              setLifetime(false);
            }}
            aria-label="Last day of access"
            className="h-9 rounded-control border border-line px-2 text-sm"
          />
        </label>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Note
        <input
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Scholarship, replacement for order IBX-1234"
          className="h-11 rounded-control border border-line px-3 text-sm font-normal"
        />
        <span className="text-xs font-normal text-ink-muted">Optional. Saved to the audit log.</span>
      </label>
      {error && <Alert tone="danger">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <Button onClick={submit} loading={pending} className="w-fit rounded-full">
        <Gift className="size-4" aria-hidden="true" /> Give access
      </Button>
    </div>
  );
}
