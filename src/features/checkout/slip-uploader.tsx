"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { submitSlipAction } from "./actions";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export function SlipUploader({ orderId, reference, userId }: { orderId: string; reference: string; userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError("Upload a photo (JPG, PNG) or PDF of your slip.");
    if (file.size > 5 * 1024 * 1024) return setError("The file must be under 5 MB.");
    setBusy(true);
    const path = `${userId}/${orderId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await createClient().storage.from("payment-slips").upload(path, file, { contentType: file.type });
    if (uploadError) {
      setBusy(false);
      return setError("The slip couldn't be uploaded. Please try again.");
    }
    const result = await submitSlipAction(orderId, reference, path);
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Something went wrong.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <Button size="lg" loading={busy} onClick={() => inputRef.current?.click()} className="w-fit rounded-full">
        <Upload className="size-4" aria-hidden="true" /> Upload payment slip
      </Button>
      <p className="text-xs text-ink-muted">A clear photo or PDF of the slip or online banking receipt, under 5 MB.</p>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
