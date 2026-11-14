"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Paperclip, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MySubmission } from "@/lib/dal/learning";
import { createClient } from "@/lib/supabase/client";
import { submitAssignmentAction } from "./actions";

const ACCEPT = [
  "application/pdf", "application/zip", "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword", "text/plain", "image/png", "image/jpeg", "image/webp",
];
const MAX_MB = 25;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Colombo" });

const STATUS_TEXT: Record<MySubmission["status"], string> = {
  submitted: "Submitted. This lesson completes when your work is approved.",
  approved: "Reviewed and approved.",
  changes_requested: "Changes requested. Update your work and submit again.",
};

type Props = {
  lessonId: string;
  slug: string;
  userId: string;
  allowText: boolean;
  allowFile: boolean;
  submission: MySubmission | null;
  team: boolean;
};

export function AssignmentSubmit({ lessonId, slug, userId, allowText, allowFile, submission, team }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(!submission);
  const [text, setText] = useState(submission?.text_answer ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [keepFile, setKeepFile] = useState(Boolean(submission?.file_name));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pickFile(f: File) {
    setError(null);
    if (!ACCEPT.includes(f.type)) return setError("Upload a PDF, Word, Excel, PowerPoint, text, image or ZIP file.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`The file must be under ${MAX_MB} MB.`);
    setFile(f);
    setKeepFile(false);
  }

  function submit() {
    setError(null);
    start(async () => {
      let filePath: string | undefined;
      let fileName: string | undefined;
      if (file) {
        const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "bin";
        filePath = `${userId}/${lessonId}/${crypto.randomUUID()}.${ext}`;
        fileName = file.name.slice(0, 200);
        const { error: uploadError } = await createClient().storage.from("assignment-submissions").upload(filePath, file, { contentType: file.type });
        if (uploadError) return setError("Your file couldn't be uploaded. Please try again.");
      }
      const res = await submitAssignmentAction(lessonId, slug, {
        text: allowText ? text : undefined,
        filePath,
        fileName,
        // Resubmitting without a new upload keeps the file sent earlier.
        keepFile: !file && keepFile && Boolean(submission?.file_name),
      });
      if (!res.ok) return setError(res.error);
      setFile(null);
      setEditing(false);
      router.refresh();
    });
  }

  if (team) {
    return <Alert tone="info">Learners submit their work here. As a team member you can see the instructions, but you can't submit.</Alert>;
  }

  if (submission && !editing) {
    return (
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-ink">Your submission</p>
          <p className="text-xs text-ink-muted">{dateFormat.format(new Date(submission.submitted_at))}</p>
        </div>
        <Alert tone={submission.status === "approved" ? "success" : submission.status === "changes_requested" ? "warning" : "info"}>
          {STATUS_TEXT[submission.status]}
        </Alert>
        {submission.feedback && (
          <div className="rounded-control bg-lilac px-4 py-3">
            <p className="text-xs font-bold text-ink">Feedback</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink">{submission.feedback}</p>
          </div>
        )}
        {submission.text_answer && <p className="whitespace-pre-line rounded-control bg-canvas px-4 py-3 text-sm text-ink">{submission.text_answer}</p>}
        {submission.file_name && (
          <a href={submission.file_url ?? undefined} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-brand hover:underline">
            <Paperclip className="size-4" aria-hidden="true" /> {submission.file_name}
          </a>
        )}
        {submission.status !== "approved" && (
          <Button variant="secondary" onClick={() => setEditing(true)} className="w-fit rounded-full">Edit and resubmit</Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <p className="font-bold text-ink">Submit your work</p>
      {allowText && (
        <Textarea
          label="Your answer"
          name="answer"
          rows={8}
          value={text}
          maxLength={20000}
          onChange={(e) => setText(e.target.value)}
          hint={allowFile ? "Write your answer, attach a file, or both." : undefined}
        />
      )}
      {allowFile && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT.join(",")}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
          {file || (keepFile && submission?.file_name) ? (
            <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-sm">
              <Paperclip className="size-4 text-ink-muted" aria-hidden="true" />
              <span className="flex-1 truncate text-ink">{file?.name ?? submission?.file_name}</span>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => {
                  setFile(null);
                  setKeepFile(false);
                }}
                className="flex size-7 items-center justify-center rounded-control text-ink-muted hover:bg-surface"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-fit rounded-full">
              <FileUp className="size-4" aria-hidden="true" /> Attach a file
            </Button>
          )}
          <p className="text-xs text-ink-muted">PDF, Word, Excel, PowerPoint, text, image or ZIP, up to {MAX_MB} MB.</p>
        </div>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={submit} loading={pending} className="rounded-full">
          {submission ? "Resubmit" : "Submit assignment"}
        </Button>
        {submission && (
          <Button variant="tertiary" onClick={() => setEditing(false)} disabled={pending} className="rounded-full">Cancel</Button>
        )}
      </div>
    </div>
  );
}
