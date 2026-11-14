"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Paperclip, Trash2, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { LessonResource } from "@/lib/courses/types";
import { createClient } from "@/lib/supabase/client";
import { deleteResourceAction, registerResourceAction } from "../../lesson-actions";

const MAX_BYTES = 100 * 1024 * 1024;
const ACCEPT = ".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.svg,.mp3,.wav";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
  return ext ? `${base}.${ext}` : base;
}

export function ResourcesManager({
  courseId,
  lessonId,
  resources,
  canUpload,
}: {
  courseId: string;
  lessonId: string;
  resources: LessonResource[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function upload(files: FileList) {
    setError(null);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(`“${file.name}” is larger than 100 MB.`);
        continue;
      }
      setUploading(file.name);
      const path = `courses/${courseId}/lessons/${lessonId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("lesson-resources")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) {
        setError(`“${file.name}” couldn't be uploaded. Check the file type and try again.`);
        continue;
      }
      const result = await registerResourceAction(courseId, lessonId, { path, name: file.name, size: file.size, type: file.type });
      if (!result.ok) setError(result.error);
    }
    setUploading(null);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    setError(null);
    const result = await deleteResourceAction(courseId, lessonId, id);
    if (!result.ok) setError(result.error);
    setConfirmId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="danger">{error}</Alert>}
      {resources.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Paperclip className="size-4" aria-hidden="true" /> No files attached.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line">
          {resources.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <FileDown className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{r.file_name}</p>
                <p className="text-xs text-ink-muted">{formatBytes(r.size_bytes)}</p>
              </div>
              {confirmId === r.id ? (
                <span className="flex items-center gap-2 text-sm text-danger-ink">
                  Remove this file?
                  <Button size="sm" variant="destructive" onClick={() => void remove(r.id)}>Remove</Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
                </span>
              ) : (
                canUpload && (
                  <button type="button" onClick={() => setConfirmId(r.id)} aria-label={`Remove ${r.file_name}`} className="flex size-8 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-danger-ink">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" size="sm" loading={Boolean(uploading)} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" aria-hidden="true" /> {uploading ? `Uploading ${uploading}…` : "Attach files"}
          </Button>
          <p className="text-xs text-ink-muted">PDF, Office files, ZIP, images or audio. Up to 100 MB each. Only enrolled learners can download them.</p>
        </div>
      )}
    </div>
  );
}
