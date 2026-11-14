"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { brand } from "@/brand";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { COLOR_PRESETS, DEFAULT_DESIGN, LIMITS, TEMPLATES, isHexColor, type CertificateDesign } from "@/lib/courses/certificate";
import { mediaUrl } from "@/lib/courses/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { saveCertificateDesignAction } from "./actions";
import { CertificateArt } from "./certificate-art";

const SIGNATURE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function CertificateDesigner({ courseId, courseTitle, initial }: { courseId: string; courseTitle: string; initial: CertificateDesign }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [design, setDesign] = useState<CertificateDesign>(initial);
  const [saved, setSaved] = useState<CertificateDesign>(initial);
  const [sampleName, setSampleName] = useState("Amaya Perera");
  const [customColor, setCustomColor] = useState(initial.color && !COLOR_PRESETS.some((c) => c.value === initial.color) ? initial.color : "#7c3aed");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const dirty = JSON.stringify(design) !== JSON.stringify(saved);
  const set = <K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => {
    setNotice(null);
    setDesign((d) => ({ ...d, [key]: value }));
  };

  async function uploadSignature(file: File) {
    setError(null);
    const ext = SIGNATURE_TYPES[file.type];
    if (!ext) return setError("Use a PNG (best with a transparent background), JPG or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setError("Use an image under 2 MB.");
    setUploading(true);
    const path = `courses/${courseId}/signature-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from("course-media")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    setUploading(false);
    if (uploadError) return setError("The signature couldn't be uploaded. Please try again.");
    set("signaturePath", path);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveCertificateDesignAction(courseId, design);
      if (!res.ok) return setError(res.error);
      setSaved(design);
      setNotice("Certificate design saved. Certificates already issued for this course now use it too.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Checkbox
        name="enabled"
        label="Give learners a certificate when they finish this course"
        hint="Issued when every lesson is complete and every assignment is approved."
        checked={design.enabled}
        onChange={(e) => set("enabled", e.target.checked)}
      />

      <div className={cn("grid gap-8 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]", !design.enabled && "pointer-events-none opacity-50")} aria-disabled={!design.enabled}>
        {/* Controls */}
        <div className="flex flex-col gap-6">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Look</legend>
            <div className="grid gap-2">
              {TEMPLATES.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5",
                    design.template === t.value ? "border-brand bg-brand-soft" : "border-line hover:bg-canvas",
                  )}
                >
                  <input type="radio" name="template" value={t.value} checked={design.template === t.value} onChange={() => set("template", t.value)} className="mt-1 accent-[var(--color-brand)]" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t.label}</span>
                    <span className="block text-xs text-ink-muted">{t.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Accent colour</legend>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => {
                const active = design.color === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => set("color", c.value)}
                    aria-pressed={active}
                    aria-label={c.label}
                    title={c.label}
                    className={cn("flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface", active ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line")}
                    style={{ background: c.value ?? "var(--color-brand)" }}
                  >
                    {active && <Check className="size-4 text-white" aria-hidden="true" />}
                  </button>
                );
              })}
              <label
                className={cn(
                  "relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-offset-2 ring-offset-surface",
                  design.color === customColor ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line",
                )}
                style={{ background: customColor }}
                title="Custom colour"
              >
                <span className="sr-only">Custom colour</span>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    if (isHexColor(e.target.value)) set("color", e.target.value.toLowerCase());
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                {design.color === customColor && <Check className="size-4 text-white" aria-hidden="true" />}
              </label>
            </div>
          </fieldset>

          <div className="flex flex-col gap-4">
            <Input
              label="Heading"
              name="heading"
              value={design.heading}
              maxLength={LIMITS.heading}
              onChange={(e) => set("heading", e.target.value)}
              placeholder={DEFAULT_DESIGN.heading}
            />
            <Input
              label="Line under the learner's name"
              name="statement"
              value={design.statement}
              maxLength={LIMITS.statement}
              onChange={(e) => set("statement", e.target.value)}
              placeholder={DEFAULT_DESIGN.statement}
              hint="The course title follows this line."
            />
          </div>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-semibold text-ink">Signed by (optional)</legend>
            <Input label="Name" name="signerName" value={design.signerName} maxLength={LIMITS.signerName} onChange={(e) => set("signerName", e.target.value)} placeholder="e.g. Nimal Perera" />
            <Input label="Title" name="signerTitle" value={design.signerTitle} maxLength={LIMITS.signerTitle} onChange={(e) => set("signerTitle", e.target.value)} placeholder={`e.g. Founder, ${brand.name}`} />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink">Signature image</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadSignature(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {design.signaturePath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(design.signaturePath) ?? ""} alt="Signature" className="h-12 max-w-40 rounded-control border border-line bg-surface object-contain p-1" />
                )}
                <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()} className="rounded-full">
                  <ImagePlus className="size-4" aria-hidden="true" /> {design.signaturePath ? "Replace" : "Upload signature"}
                </Button>
                {design.signaturePath && (
                  <Button variant="tertiary" size="sm" onClick={() => set("signaturePath", null)} className="rounded-full">
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-ink-muted">Sign on white paper, take a photo, and remove the background for the best result. PNG, up to 2 MB.</p>
            </div>
          </fieldset>
        </div>

        {/* Live preview */}
        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-24 xl:self-start">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Preview</p>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              Sample name
              <input
                value={sampleName}
                maxLength={60}
                onChange={(e) => setSampleName(e.target.value)}
                className="h-8 w-40 rounded-control border border-line px-2 text-sm text-ink"
              />
            </label>
          </div>
          <div className="rounded-card bg-canvas p-3 sm:p-5">
            <CertificateArt
              design={design}
              studentName={sampleName || "Learner name"}
              courseTitle={courseTitle}
              issuedAt={new Date()}
              code="IBX-PREV-IEW0"
              signatureUrl={mediaUrl(design.signaturePath)}
              className={cn("shadow-float", design.template === "bold" && "rounded-[14px]")}
            />
          </div>
          <p className="text-xs text-ink-muted">Learners see exactly this, with their own name, the issue date and a unique ID anyone can verify.</p>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {notice && !dirty && <Alert tone="success">{notice}</Alert>}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-float">
        <Button onClick={save} loading={pending} disabled={!dirty || uploading} className="rounded-full">Save certificate</Button>
        <span className="text-sm text-ink-muted" aria-live="polite">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        {dirty && (
          <Button variant="tertiary" size="sm" onClick={() => setDesign(saved)} disabled={pending} className="ml-auto rounded-full">Discard changes</Button>
        )}
      </div>
    </div>
  );
}
