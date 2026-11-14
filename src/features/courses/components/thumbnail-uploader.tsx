"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { setThumbnailAction } from "../actions";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function ThumbnailUploader({ courseId, currentUrl }: { courseId: string; currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("Use an image under 5 MB.");

    setBusy(true);
    const path = `courses/${courseId}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("course-media")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (uploadError) {
      setBusy(false);
      return setError("The image couldn't be uploaded. Please try again.");
    }
    const result = await setThumbnailAction(courseId, path);
    setBusy(false);
    if (result.error) return setError(result.error);
    startTransition(() => router.refresh());
  }

  async function remove() {
    setBusy(true);
    const result = await setThumbnailAction(courseId, null);
    setBusy(false);
    if (result.error) return setError(result.error);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink">Course image</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="aspect-video w-full max-w-[280px] overflow-hidden rounded-control border border-line bg-brand-soft">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="Current course image" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-ink-muted">No image yet</div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" aria-hidden="true" />
            {currentUrl ? "Replace image" : "Upload image"}
          </Button>
          {currentUrl && (
            <Button variant="tertiary" size="sm" disabled={busy} onClick={() => void remove()}>
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </Button>
          )}
          <p className="text-xs text-ink-muted">16:9, at least 1280×720. JPG, PNG or WebP, up to 5 MB.</p>
        </div>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
