"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { brand } from "@/brand";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { COLOR_PRESETS, DEFAULT_DESIGN, DEFAULT_SIGNATURE_DIR, LIMITS, TEMPLATES, isHexColor, type CertificateDesign } from "@/lib/courses/certificate";
import { mediaUrl } from "@/lib/courses/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { saveCertificateDesignAction, saveDefaultCertificateAction } from "./actions";
import { CertificateArt } from "./certificate-art";

const SIGNATURE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

type Props =
  | {
      /** A course: follows the academy default unless customised. */
      mode: "course";
      courseId: string;
      courseTitle: string;
      initial: CertificateDesign;
      initialUseDefault: boolean;
      /** The course has its own saved design (to restore when switching back). */
      hasCustom: boolean;
      defaultDesign: CertificateDesign;
      /** Owner: link to edit the default in Settings. */
      settingsHref: string | null;
    }
  | { mode: "default"; initial: CertificateDesign };

export function CertificateDesigner(props: Props) {
  const { initial } = props;
  const isCourse = props.mode === "course";
  const courseTitle = isCourse ? props.courseTitle : "Your course title appears here";
  const router = useRouter();
  const [design, setDesign] = useState<CertificateDesign>(initial);
  const [saved, setSaved] = useState<CertificateDesign>(initial);
  const [useDefault, setUseDefault] = useState(isCourse ? props.initialUseDefault : false);
  const [savedUseDefault, setSavedUseDefault] = useState(useDefault);
  const [customStarted, setCustomStarted] = useState(isCourse ? props.hasCustom : true);
  const [sampleName, setSampleName] = useState("Amaya Perera");
  const [customColor, setCustomColor] = useState(initial.color && !COLOR_PRESETS.some((c) => c.value === initial.color) ? initial.color : "#7c3aed");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState<SignatureSlot | null>(null);
  const [pending, start] = useTransition();

  const dirty = JSON.stringify(design) !== JSON.stringify(saved) || useDefault !== savedUseDefault;
  const showControls = !isCourse || !useDefault;
  const preview: CertificateDesign = isCourse && useDefault ? { ...props.defaultDesign, enabled: design.enabled } : design;

  function chooseDefault(next: boolean) {
    setNotice(null);
    setUseDefault(next);
    // First time customising: start from the academy default rather than a blank design.
    if (!next && isCourse && !customStarted) {
      setDesign((d) => ({ ...props.defaultDesign, enabled: d.enabled }));
      setCustomStarted(true);
    }
  }
  const set = <K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => {
    setNotice(null);
    setDesign((d) => ({ ...d, [key]: value }));
  };

  async function uploadSignature(slot: SignatureSlot, file: File) {
    setError(null);
    const ext = SIGNATURE_TYPES[file.type];
    if (!ext) return setError("Use a PNG (best with a transparent background), JPG or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setError("Use an image under 2 MB.");
    setUploading(slot);
    const folder = props.mode === "course" ? `courses/${props.courseId}` : DEFAULT_SIGNATURE_DIR;
    const path = `${folder}/signature-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from("course-media")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    setUploading(null);
    if (uploadError) return setError("The signature couldn't be uploaded. Please try again.");
    set(slot, path);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = props.mode === "course" ? await saveCertificateDesignAction(props.courseId, design, useDefault) : await saveDefaultCertificateAction(design);
      if (!res.ok) return setError(res.error);
      setSaved(design);
      setSavedUseDefault(useDefault);
      setNotice(
        props.mode === "default"
          ? "Default certificate saved. Every course that uses it, and certificates already issued for them, now show it."
          : "Certificate saved. Certificates already issued for this course now use it too.",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {isCourse && (
        <Checkbox
          name="enabled"
          label="Give learners a certificate when they finish this course"
          hint="Issued when every lesson is complete and every assignment is approved."
          checked={design.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
      )}

      {isCourse && (
        <fieldset className={cn(!design.enabled && "pointer-events-none opacity-50")}>
          <legend className="mb-2 text-sm font-semibold text-ink">Design</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: true, label: "Academy default", text: "Same look, signatures and wording as your other courses. Change it once in Settings." },
              { value: false, label: "Custom for this course", text: "A different look or signer just for this course." },
            ].map((o) => (
              <label
                key={o.label}
                className={cn("flex cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5", useDefault === o.value ? "border-brand bg-brand-soft" : "border-line hover:bg-canvas")}
              >
                <input type="radio" name="useDefault" checked={useDefault === o.value} onChange={() => chooseDefault(o.value)} className="mt-1 accent-[var(--color-brand)]" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{o.label}</span>
                  <span className="block text-xs text-ink-muted">{o.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={cn("grid gap-8 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]", !design.enabled && "pointer-events-none opacity-50")} aria-disabled={!design.enabled}>
        {/* Controls */}
        {!showControls && props.mode === "course" ? (
          <div className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-5 text-sm text-ink-muted">
            <p className="font-semibold text-ink">This course uses the academy default certificate.</p>
            <p>Its look, signatures and wording are set once for every course, so they stay consistent.</p>
            {props.settingsHref ? (
              <Link href={props.settingsHref} className="font-semibold text-brand hover:underline">Edit the default certificate in Settings</Link>
            ) : (
              <p>Only the Owner can change the default.</p>
            )}
            {!props.defaultDesign.signerName && <p className="text-warning-ink">No signature has been added to the default yet.</p>}
          </div>
        ) : (
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

          <Input
            label="Recognition line (optional)"
            name="note"
            value={design.note}
            maxLength={LIMITS.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="e.g. In recognition of dedication and hard work."
            hint="A short line under the course title. Shown on the Prestige look."
          />

          <SignerFields
            legend="Signed by (optional)"
            slot="signaturePath"
            name={design.signerName}
            title={design.signerTitle}
            path={design.signaturePath}
            uploading={uploading === "signaturePath"}
            onName={(v) => set("signerName", v)}
            onTitle={(v) => set("signerTitle", v)}
            onUpload={(f) => void uploadSignature("signaturePath", f)}
            onRemove={() => set("signaturePath", null)}
          />
          {design.template === "prestige" && (
            <SignerFields
              legend="Second signature (optional)"
              slot="signature2Path"
              name={design.signer2Name}
              title={design.signer2Title}
              path={design.signature2Path}
              uploading={uploading === "signature2Path"}
              onName={(v) => set("signer2Name", v)}
              onTitle={(v) => set("signer2Title", v)}
              onUpload={(f) => void uploadSignature("signature2Path", f)}
              onRemove={() => set("signature2Path", null)}
            />
          )}
        </div>
        )}

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
              design={preview}
              studentName={sampleName || "Learner name"}
              courseTitle={courseTitle}
              issuedAt={new Date()}
              code="IBX-PREV-IEW0"
              signatureUrl={mediaUrl(preview.signaturePath)}
              signature2Url={mediaUrl(preview.signature2Path)}
              className={cn("shadow-float", preview.template === "bold" && "rounded-[14px]")}
            />
          </div>
          <p className="text-xs text-ink-muted">
            {isCourse ? "Learners see exactly this, with their own name, the issue date and a unique ID anyone can verify." : "Each course shows its own title here. Learners see their own name, the issue date and a unique ID anyone can verify."}
          </p>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {notice && !dirty && <Alert tone="success">{notice}</Alert>}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-float">
        <Button onClick={save} loading={pending} disabled={!dirty || uploading !== null} className="rounded-full">{isCourse ? "Save certificate" : "Save default certificate"}</Button>
        <span className="text-sm text-ink-muted" aria-live="polite">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        {dirty && (
          <Button variant="tertiary" size="sm" onClick={() => {
              setDesign(saved);
              setUseDefault(savedUseDefault);
            }} disabled={pending} className="ml-auto rounded-full">Discard changes</Button>
        )}
      </div>
    </div>
  );
}

type SignatureSlot = "signaturePath" | "signature2Path";

function SignerFields(props: {
  legend: string;
  slot: SignatureSlot;
  name: string;
  title: string;
  path: string | null;
  uploading: boolean;
  onName: (v: string) => void;
  onTitle: (v: string) => void;
  onUpload: (f: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const url = mediaUrl(props.path);
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-semibold text-ink">{props.legend}</legend>
      <Input label="Name" name={props.slot === "signaturePath" ? "signerName" : "signer2Name"} value={props.name} maxLength={LIMITS.signerName} onChange={(e) => props.onName(e.target.value)} placeholder="e.g. Nimal Perera" />
      <Input label="Title" name={props.slot === "signaturePath" ? "signerTitle" : "signer2Title"} value={props.title} maxLength={LIMITS.signerTitle} onChange={(e) => props.onTitle(e.target.value)} placeholder={`e.g. Founder, ${brand.name}`} />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink">Signature image</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label={`${props.legend}: signature image`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onUpload(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Signature" className="h-12 max-w-40 rounded-control border border-line bg-surface object-contain p-1" />
          )}
          <Button variant="secondary" size="sm" loading={props.uploading} onClick={() => fileRef.current?.click()} className="rounded-full">
            <ImagePlus className="size-4" aria-hidden="true" /> {props.path ? "Replace" : "Upload signature"}
          </Button>
          {props.path && (
            <Button variant="tertiary" size="sm" onClick={props.onRemove} className="rounded-full">
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-muted">Sign on white paper, take a photo, and remove the background for the best result. PNG, up to 2 MB.</p>
      </div>
    </fieldset>
  );
}
