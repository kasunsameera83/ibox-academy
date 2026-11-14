"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { QuizOption, QuizQuestion } from "@/lib/courses/types";
import { cn } from "@/lib/utils";
import { deleteQuestionAction, moveQuestionAction, saveQuestionAction, saveQuizSettingsAction } from "../../lesson-actions";

const LETTERS = "abcdef";

type Draft = { prompt: string; options: QuizOption[]; correctOptionId: string; explanation: string };

function emptyDraft(): Draft {
  return { prompt: "", options: [{ id: "a", text: "" }, { id: "b", text: "" }], correctOptionId: "a", explanation: "" };
}

function QuestionEditor({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial: Draft;
  onSave: (d: Draft) => Promise<boolean>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function addOption() {
    const used = new Set(draft.options.map((o) => o.id));
    const id = LETTERS.split("").find((l) => !used.has(l));
    if (id) set({ options: [...draft.options, { id, text: "" }] });
  }

  function removeOption(id: string) {
    const options = draft.options.filter((o) => o.id !== id);
    set({ options, correctOptionId: draft.correctOptionId === id ? options[0]?.id ?? "" : draft.correctOptionId });
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-card border border-brand/40 bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(draft);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="q-prompt">Question</label>
        <textarea
          id="q-prompt"
          value={draft.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          rows={2}
          maxLength={1000}
          autoFocus
          className="rounded-control border border-line px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Answers <span className="font-normal text-ink-muted">(select the correct one)</span></legend>
        {draft.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={draft.correctOptionId === o.id}
              onChange={() => set({ correctOptionId: o.id })}
              aria-label={`Mark answer ${i + 1} as correct`}
              className="size-4 accent-[var(--brand-primary)]"
            />
            <label className="sr-only" htmlFor={`opt-${o.id}`}>Answer {i + 1}</label>
            <input
              id={`opt-${o.id}`}
              value={o.text}
              onChange={(e) => set({ options: draft.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })}
              placeholder={`Answer ${i + 1}`}
              maxLength={300}
              className={cn(
                "h-10 min-w-0 flex-1 rounded-control border px-3 text-sm focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30",
                draft.correctOptionId === o.id ? "border-success bg-success-soft/40" : "border-line",
              )}
            />
            <button
              type="button"
              onClick={() => removeOption(o.id)}
              disabled={draft.options.length <= 2}
              aria-label={`Remove answer ${i + 1}`}
              className="flex size-9 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-danger-ink disabled:opacity-30"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {draft.options.length < 6 && (
          <button type="button" onClick={addOption} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <Plus className="size-4" aria-hidden="true" /> Add answer
          </button>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="q-explain">Explanation <span className="font-normal text-ink-muted">(optional, shown after answering)</span></label>
        <textarea
          id="q-explain"
          value={draft.explanation}
          onChange={(e) => set({ explanation: e.target.value })}
          rows={2}
          maxLength={2000}
          className="rounded-control border border-line px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy}>Save question</Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function QuizBuilder({
  courseId,
  lessonId,
  questions,
  passPercent,
}: {
  courseId: string;
  lessonId: string;
  questions: QuizQuestion[];
  passPercent: number;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(questions.length === 0 ? "new" : null);
  const [error, setError] = useState<string | null>(null);
  const [pass, setPass] = useState(String(passPercent));
  const [passSaved, setPassSaved] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const r = await fn();
    if (!r.ok) {
      setError(r.error ?? "Something went wrong.");
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <Alert tone="danger">{error}</Alert>}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setPassSaved(false);
          if (await run(() => saveQuizSettingsAction(courseId, lessonId, Number(pass)))) setPassSaved(true);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pass" className="text-sm font-semibold text-ink">Pass mark (%)</label>
          <input id="pass" type="number" min={1} max={100} value={pass} onChange={(e) => { setPass(e.target.value); setPassSaved(false); }} className="h-10 w-28 rounded-control border border-line px-3 text-sm" />
        </div>
        <Button type="submit" size="sm" variant="secondary" className="h-10" disabled={busy}>Save pass mark</Button>
        {passSaved && <span className="pb-2.5 text-xs font-semibold text-success-ink">Saved</span>}
      </form>

      <ol className="flex flex-col gap-3">
        {questions.map((q, i) =>
          editing === q.id ? (
            <li key={q.id}>
              <QuestionEditor
                initial={{ prompt: q.prompt, options: q.options, correctOptionId: q.correct_option_id ?? q.options[0]?.id ?? "a", explanation: q.explanation ?? "" }}
                busy={busy}
                onCancel={() => setEditing(null)}
                onSave={async (d) => {
                  const ok = await run(() => saveQuestionAction(courseId, lessonId, q.id, d));
                  if (ok) setEditing(null);
                  return ok;
                }}
              />
            </li>
          ) : (
            <li key={q.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-sm font-bold text-brand">Q{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{q.prompt}</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {q.options.map((o) => (
                      <li key={o.id} className={cn("flex items-center gap-2 text-sm", o.id === q.correct_option_id ? "font-semibold text-success-ink" : "text-ink-muted")}>
                        {o.id === q.correct_option_id ? <CheckCircle2 className="size-4" aria-label="Correct answer" /> : <span className="size-4" aria-hidden="true" />}
                        {o.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center">
                  <button type="button" aria-label={`Edit question ${i + 1}`} onClick={() => setEditing(q.id)} className="flex size-8 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-ink"><Pencil className="size-4" /></button>
                  <button type="button" aria-label={`Move question ${i + 1} up`} disabled={i === 0 || busy} onClick={() => void run(() => moveQuestionAction(courseId, lessonId, q.id, "up"))} className="flex size-8 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label={`Move question ${i + 1} down`} disabled={i === questions.length - 1 || busy} onClick={() => void run(() => moveQuestionAction(courseId, lessonId, q.id, "down"))} className="flex size-8 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"><ArrowDown className="size-4" /></button>
                  <button type="button" aria-label={`Delete question ${i + 1}`} disabled={busy} onClick={() => void run(() => deleteQuestionAction(courseId, lessonId, q.id))} className="flex size-8 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-danger-ink"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </li>
          ),
        )}
      </ol>

      {editing === "new" ? (
        <QuestionEditor
          initial={emptyDraft()}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (d) => {
            const ok = await run(() => saveQuestionAction(courseId, lessonId, null, d));
            if (ok) setEditing(null);
            return ok;
          }}
        />
      ) : (
        <Button variant="secondary" size="sm" className="w-fit" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden="true" /> Add question
        </Button>
      )}
    </div>
  );
}
