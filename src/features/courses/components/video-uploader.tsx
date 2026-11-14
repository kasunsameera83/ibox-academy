"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "tus-js-client";
import { RefreshCw, UploadCloud, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatClock } from "@/lib/courses/format";
import type { VideoStatus } from "@/lib/courses/types";
import {
  markVideoFailedAction,
  markVideoUploadedAction,
  prepareVideoUploadAction,
  refreshVideoStatusAction,
} from "../video-actions";

const MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const POLL_MS = 8000;

export function VideoUploader({
  lessonId,
  status: initialStatus,
  durationSeconds,
}: {
  lessonId: string;
  status: VideoStatus;
  durationSeconds: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<Upload | null>(null);
  const [status, setStatus] = useState<VideoStatus>(initialStatus);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localUpload, setLocalUpload] = useState(false);

  useEffect(() => setStatus(initialStatus), [initialStatus]);

  // While Bunny is encoding, check every few seconds.
  useEffect(() => {
    if (status !== "processing") return;
    const timer = setInterval(async () => {
      const result = await refreshVideoStatusAction(lessonId);
      if (result.ok && result.status && result.status !== "processing") {
        setStatus(result.status);
        router.refresh();
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [status, lessonId, router]);

  // Warn before closing the tab mid-upload.
  useEffect(() => {
    if (!localUpload) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [localUpload]);

  async function start(file: File) {
    setError(null);
    if (!file.type.startsWith("video/")) return setError("Choose a video file (MP4, MOV, WebM…).");
    if (file.size > MAX_BYTES) return setError("Videos must be under 5 GB.");

    setStatus("uploading");
    setProgress(0);
    setLocalUpload(true);
    const ticket = await prepareVideoUploadAction(lessonId);
    if (!ticket.ok) {
      setLocalUpload(false);
      setStatus(initialStatus === "uploading" ? "none" : initialStatus);
      return setError(ticket.error);
    }

    const upload = new Upload(file, {
      endpoint: ticket.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      chunkSize: 50 * 1024 * 1024,
      headers: {
        AuthorizationSignature: ticket.signature,
        AuthorizationExpire: String(ticket.expires),
        VideoId: ticket.videoId,
        LibraryId: ticket.libraryId,
      },
      metadata: { filetype: file.type, title: file.name },
      onProgress: (sent, total) => setProgress(total ? Math.round((sent / total) * 100) : 0),
      onError: async () => {
        setLocalUpload(false);
        setStatus("failed");
        setError("The upload stopped. Check your connection and try again.");
        await markVideoFailedAction(lessonId);
      },
      onSuccess: async () => {
        setLocalUpload(false);
        setStatus("processing");
        await markVideoUploadedAction(lessonId);
        router.refresh();
      },
    });
    uploadRef.current = upload;
    upload.start();
  }

  async function cancel() {
    await uploadRef.current?.abort(true);
    setLocalUpload(false);
    setStatus("failed");
    setError("Upload cancelled.");
    await markVideoFailedAction(lessonId);
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="video/*"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void start(file);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      {picker}
      {status === "uploading" && localUpload ? (
        <div className="flex items-center gap-3">
          <div
            className="h-2 w-40 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-xs font-semibold tabular-nums text-ink">{progress}%</span>
          <button type="button" onClick={() => void cancel()} className="flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-danger-ink">
            <X className="size-3.5" aria-hidden="true" /> Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {status === "ready" && <StatusBadge status="completed" label={`Video ready${durationSeconds ? ` · ${formatClock(durationSeconds)}` : ""}`} />}
          {status === "processing" && <StatusBadge status="pending" label="Processing video…" />}
          {status === "failed" && <StatusBadge status="failed" label="Upload failed" />}
          {status === "uploading" && <StatusBadge status="pending" label="Upload interrupted" />}
          {status === "none" && <StatusBadge status="draft" label="No video" />}
          {status !== "processing" && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
            >
              {status === "none" ? <UploadCloud className="size-3.5" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
              {status === "none" ? "Upload video" : status === "ready" ? "Replace video" : "Upload again"}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs font-medium text-danger-ink" role="alert">{error}</p>}
      {status === "uploading" && localUpload && (
        <p className="text-xs text-ink-muted">Keep this tab open until the upload finishes.</p>
      )}
    </div>
  );
}
