"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { LearnerQuestion, QuizAttemptSummary } from "@/lib/dal/learning";
import { cn } from "@/lib/utils";
import { submitQuizAction, type QuizResult } from "./actions";

type Props = {
  lessonId: string;
  slug: string;
  questions: LearnerQuestion[];
  passPercent: number;
  lastAttempt: QuizAttemptSummary | null;
  bestPercent: number | null;
  passed: boolean;
  team: boolean;
};

export function QuizRunner({ lessonId, slug, questions, passPercent, lastAttempt, bestPercent, passed, team }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"intro" | "answering" | "result">(lastAttempt || team ? "intro" : "answering");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const answered = questions.filter((q) => answers[q.id]).length;

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitQuizAction(lessonId, slug, answers);
      if (!res.ok) return setError(res.error);
      setResult(res.result);
      setStage("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    });
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setStage("answering");
  }

  if (questions.length === 0) {
    return <Alert tone="info">This quiz doesn't have any questions yet. Check back soon.</Alert>;
  }

  if (stage === "intro") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-canvas p-6">
        <p className="text-ink">
          {questions.length} question{questions.length === 1 ? "" : "s"}. You need {passPercent}% to pass, and you can try as many times as you like.
        </p>
        {lastAttempt && (
          <p className="text-sm text-ink-muted">
            Last try: <span className="font-semibold text-ink">{lastAttempt.percent}%</span>
            {bestPercent !== null && bestPercent !== lastAttempt.percent && <> · Best: <span className="font-semibold text-ink">{bestPercent}%</span></>}
            {passed && <span className="font-semibold text-success-ink"> · Passed</span>}
          </p>
        )}
        {team && <p className="text-sm text-ink-muted">You can try this quiz as a team member. Your answers aren't saved.</p>}
        <Button onClick={() => setStage("answering")} className="rounded-full">
          {lastAttempt ? "Try again" : "Start quiz"}
        </Button>
      </div>
    );
  }

  const byId = new Map<string, QuizResult["results"][number]>((result?.results ?? []).map((r) => [r.id, r]));

  return (
    <div className="flex flex-col gap-6">
      {stage === "result" && result && (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-card border-2 p-6 sm:flex-row sm:items-center",
            result.passed ? "border-success bg-success-soft" : "border-warning bg-warning-soft",
          )}
          role="status"
        >
          <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-full", result.passed ? "bg-success text-white" : "bg-warning text-ink")}>
            {result.passed ? <Trophy className="size-7" aria-hidden="true" /> : <RotateCcw className="size-7" aria-hidden="true" />}
          </span>
          <div className="flex-1">
            <p className="text-2xl font-bold text-ink">
              {result.percent}% · {result.correct} of {result.total} correct
            </p>
            <p className="text-sm text-ink">
              {result.passed
                ? team ? "That's a pass. As a team member, this isn't saved." : "You passed. This lesson is now complete."
                : `You need ${result.passPercent}% to pass. Review the answers below and try again.`}
            </p>
          </div>
          {!result.passed && (
            <Button onClick={retry} className="rounded-full">
              <RotateCcw className="size-4" aria-hidden="true" /> Try again
            </Button>
          )}
        </div>
      )}

      <ol className="flex flex-col gap-5">
        {questions.map((q, index) => {
          const r = byId.get(q.id);
          return (
            <li key={q.id} className="rounded-card border border-line bg-surface p-5">
              <fieldset disabled={stage === "result" || pending}>
                <legend className="mb-3 font-bold text-ink">
                  <span className="text-ink-muted">{index + 1}. </span>
                  {q.prompt}
                </legend>
                <div className="flex flex-col gap-2">
                  {q.options.map((o) => {
                    const chosen = answers[q.id] === o.id;
                    const isCorrect = r?.correct === o.id;
                    const wrongPick = r && chosen && !isCorrect;
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-control border px-4 py-3 text-sm transition-colors",
                          !r && (chosen ? "border-brand bg-brand-soft" : "border-line hover:bg-canvas"),
                          r && isCorrect && "border-success bg-success-soft",
                          wrongPick && "border-danger bg-danger-soft",
                          r && !isCorrect && !wrongPick && "border-line opacity-70",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={o.id}
                          checked={chosen}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                          className="size-4 accent-[var(--color-brand)]"
                        />
                        <span className="flex-1 text-ink">{o.text}</span>
                        {r && isCorrect && <CheckCircle2 className="size-4 text-success-ink" aria-label="Correct answer" />}
                        {wrongPick && <XCircle className="size-4 text-danger-ink" aria-label="Your answer" />}
                      </label>
                    );
                  })}
                </div>
                {r && r.explanation && <p className="mt-3 rounded-control bg-canvas px-4 py-3 text-sm text-ink-muted">{r.explanation}</p>}
                {r && !r.chosen && <p className="mt-2 text-xs font-medium text-warning-ink">You didn't answer this one.</p>}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {stage === "answering" && (
        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 shadow-float">
          <p className="text-sm text-ink-muted" aria-live="polite">
            {answered} of {questions.length} answered
          </p>
          <Button onClick={submit} loading={pending} disabled={answered === 0} className="rounded-full">
            Check my answers
          </Button>
        </div>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
