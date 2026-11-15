"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { MediaAsset } from "@/lib/dal/cms";
import { cn } from "@/lib/utils";
import { deleteMediaAction, registerMediaAction, updateMediaAltAction } from "../actions";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function dimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

const sizeLabel = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/**
 * Media library in a dialog: pick an image, upload a new one, describe it
 * (alt text) and delete images no page uses.
 */
export function MediaPicker({
  media, value, onChange, label, canEdit, hint,
}: {
  media: MediaAsset[]; value: string | null; onChange: (id: string | null) => void; label: string; canEdit: boolean; hint?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const altId = useId();
  const [selected, setSelected] = useState<string | null>(value);
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const current = value ? media.find((m) => m.id === value) : undefined;
  const chosen = selected ? media.find((m) => m.id === selected) : undefined;

  function open() {
    setSelected(value);
    setAlt(current?.alt ?? "");
    setError(null);
    setNotice(null);
    ref.current?.showModal();
  }

  function pick(m: MediaAsset) {
    setSelected(m.id);
    setAlt(m.alt);
    setError(null);
    setNotice(null);
  }

  async function upload(file: File) {
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError("Use a JPG, PNG, WebP or AVIF image.");
    if (file.size > 5 * 1024 * 1024) return setError("Use an image under 5 MB. Large photos can be resized before uploading.");
    setUploading(true);
    const { width, height } = await dimensions(file);
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await createClient().storage.from("site-media").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (upErr) {
      setUploading(false);
      return setError("The image couldn't be uploaded. Please try again.");
    }
    const res = await registerMediaAction({ path, mime: file.type, size: file.size, width, height, alt: "", fileName: file.name });
    setUploading(false);
    if (!res.ok) return setError(res.error);
    setSelected(res.id);
    setAlt("");
    setNotice("Uploaded. Describe the image below, then choose Use image.");
    router.refresh();
  }

  function useImage() {
    if (!chosen) return;
    if (!alt.trim()) return setError("Describe the image for people using screen readers, or write “decorative” if it adds no information.");
    start(async () => {
      const decorative = alt.trim().toLowerCase() === "decorative";
      if (alt !== chosen.alt) {
        const res = await updateMediaAltAction(chosen.id, decorative ? "" : alt);
        if (!res.ok) return setError(res.error);
        router.refresh();
      }
      onChange(chosen.id);
      ref.current?.close();
    });
  }

  function remove() {
    if (!chosen) return;
    start(async () => {
      const res = await deleteMediaAction(chosen.id);
      if (!res.ok) return setError(res.error);
      setSelected(null);
      setNotice("Image deleted.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-3 rounded-tile border border-line p-2">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {current ? <img src={current.url} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-ink-muted" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{current ? current.alt || "No description (decorative)" : "No image"}</p>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={open} disabled={!canEdit} className="text-sm font-semibold text-brand hover:underline disabled:opacity-50">
              {current ? "Change" : "Choose image"}
            </button>
            {current && canEdit && (
              <button type="button" onClick={() => onChange(null)} className="text-sm font-semibold text-ink-muted hover:underline">Remove</button>
            )}
          </div>
        </div>
      </div>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto h-[min(720px,calc(100dvh-2rem))] w-[min(880px,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id={titleId} className="text-lg font-bold">Media library</h2>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }}
              />
              <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading} disabled={uploading}>
                <ImagePlus className="size-4" /> Upload image
              </Button>
              <button type="button" aria-label="Close" onClick={() => ref.current?.close()} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink/5">
                <X className="size-5" />
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_280px]">
            <div className="min-h-0 overflow-y-auto p-5">
              {media.length === 0 ? (
                <p className="py-16 text-center text-sm text-ink-muted">No images yet. Upload a JPG, PNG, WebP or AVIF under 5 MB.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {media.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => pick(m)}
                        aria-pressed={selected === m.id}
                        className={cn(
                          "block aspect-square w-full overflow-hidden rounded-tile border-2 bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                          selected === m.id ? "border-brand" : "border-transparent hover:border-ink/20",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.url} alt={m.alt || m.file_name || "Image"} loading="lazy" className="size-full object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-4 border-t border-line p-5 md:border-l md:border-t-0">
              {error && <Alert tone="danger">{error}</Alert>}
              {notice && <p role="status" className="text-sm font-medium text-success-ink">{notice}</p>}
              {chosen ? (
                <>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-ink-muted">File</dt><dd className="truncate">{chosen.file_name ?? "—"}</dd>
                    <dt className="text-ink-muted">Size</dt><dd>{chosen.width && chosen.height ? `${chosen.width} × ${chosen.height}, ` : ""}{sizeLabel(chosen.size_bytes)}</dd>
                  </dl>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={altId} className="text-sm font-semibold">Description (alt text)</label>
                    <textarea
                      id={altId}
                      rows={3}
                      maxLength={250}
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand/30"
                    />
                    <p className="text-xs text-ink-muted">What the image shows, in a sentence. Write “decorative” if it adds nothing.</p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <Button onClick={useImage} loading={pending} disabled={pending}>Use image</Button>
                    <Button variant="tertiary" size="sm" onClick={remove} disabled={pending}>
                      <Trash2 className="size-4" /> Delete from library
                    </Button>
                    <p className="text-xs text-ink-muted">Images still used on a page can’t be deleted.</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Choose an image to see its details.</p>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
