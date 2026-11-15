"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_SETTING_KEY, DEFAULT_SIGNATURE_DIR, LIMITS, parseDesign, type CertificateDesign } from "@/lib/courses/certificate";
import { requirePermission, requireRole } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";
import { revalidateWorkspaces } from "@/lib/workspace";

const schema = z.object({
  enabled: z.boolean(),
  template: z.enum(["prestige", "bold", "classic", "minimal"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid colour.").nullable(),
  heading: z.string().trim().min(1, "Add a heading.").max(LIMITS.heading, `Keep the heading under ${LIMITS.heading} characters.`),
  statement: z.string().trim().min(1, "Add the line under the name.").max(LIMITS.statement, `Keep this line under ${LIMITS.statement} characters.`),
  signerName: z.string().trim().max(LIMITS.signerName),
  signerTitle: z.string().trim().max(LIMITS.signerTitle),
  signaturePath: z.string().max(300).nullable(),
  note: z.string().trim().max(LIMITS.note, `Keep the extra line under ${LIMITS.note} characters.`),
  signer2Name: z.string().trim().max(LIMITS.signerName),
  signer2Title: z.string().trim().max(LIMITS.signerTitle),
  signature2Path: z.string().max(300).nullable(),
});

type Result = { ok: true } | { ok: false; error: string };

const SIGNATURE_FILE = "signature-[a-z0-9-]+\\.(png|jpg|jpeg|webp)";
const defaultSignature = new RegExp(`^${DEFAULT_SIGNATURE_DIR}/${SIGNATURE_FILE}$`);

/** Shared checks for a course design and the academy default. */
function validate(input: CertificateDesign, signatureOk: (path: string) => boolean): { ok: true; design: z.infer<typeof schema> } | { ok: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the design and try again." };
  const design = parsed.data;
  for (const path of [design.signaturePath, design.signature2Path]) {
    if (path && !signatureOk(path)) return { ok: false, error: "A signature image couldn't be attached. Please upload it again." };
  }
  if (design.signaturePath && !design.signerName) return { ok: false, error: "Add the signer's name to go with the signature." };
  if (design.signature2Path && !design.signer2Name) return { ok: false, error: "Add the second signer's name to go with their signature." };
  return { ok: true, design: { ...design, color: design.color?.toLowerCase() ?? null } };
}

/**
 * Saves a course's certificate. With useDefault the course shows the academy
 * default; its own design is still kept so switching back restores it.
 */
export async function saveCertificateDesignAction(courseId: string, input: CertificateDesign, useDefault = false): Promise<Result> {
  const user = await requirePermission("courses.edit");
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false, error: "Course not found." };
  const courseSignature = new RegExp(`^courses/${courseId}/${SIGNATURE_FILE}$`);
  // A course design started from the default may still point at the default's signature.
  const checked = useDefault
    ? { ok: true as const, design: null }
    : validate(input, (path) => courseSignature.test(path) || defaultSignature.test(path));
  if (!checked.ok) return checked;

  const supabase = await createClient();
  const { data: before } = await supabase.from("courses").select("certificate, slug").eq("id", courseId).maybeSingle();
  if (!before) return { ok: false, error: "Course not found." };
  const previous = (before as { certificate: unknown }).certificate;
  const previousObject = previous && typeof previous === "object" && !Array.isArray(previous) ? (previous as Record<string, unknown>) : {};

  const certificate = checked.design
    ? checked.design
    : { ...previousObject, useDefault: true, enabled: Boolean(input.enabled) };

  const { error } = await supabase.from("courses").update({ certificate, updated_by: user.id }).eq("id", courseId);
  if (error) return { ok: false, error: "The design couldn't be saved. Please try again." };

  // Remove a replaced course signature so old images don't pile up. Never the default's.
  if (checked.design) {
    const old = parseDesign(previous);
    const kept = new Set([checked.design.signaturePath, checked.design.signature2Path].filter(Boolean));
    const stale = [old.signaturePath, old.signature2Path].filter((p): p is string => Boolean(p) && !kept.has(p) && courseSignature.test(p!));
    if (stale.length) await supabase.storage.from("course-media").remove(stale);
  }

  await recordAudit(user.id, "course.certificate_design", { type: "course", id: courseId }, {
    design: useDefault ? "academy default" : input.template,
    enabled: Boolean(input.enabled),
  });
  revalidateWorkspaces(`/courses/${courseId}`);
  revalidatePath("/certificates", "layout");
  return { ok: true };
}

/** Owner only: the academy-wide certificate every course uses unless customised. */
export async function saveDefaultCertificateAction(input: CertificateDesign): Promise<Result> {
  const user = await requireRole("owner");
  const checked = validate({ ...input, enabled: true }, (path) => defaultSignature.test(path));
  if (!checked.ok) return checked;
  const { enabled: _enabled, ...design } = checked.design;
  void _enabled;

  const supabase = await createClient();
  const { data: before } = await supabase.from("site_settings").select("value").eq("key", DEFAULT_SETTING_KEY).maybeSingle();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: DEFAULT_SETTING_KEY, value: design, is_public: true, updated_by: user.id });
  if (error) return { ok: false, error: "The default certificate couldn't be saved. Please try again." };

  // Delete replaced default signatures, unless a customised course still shows them.
  const old = parseDesign((before as { value: unknown } | null)?.value);
  const kept = new Set([design.signaturePath, design.signature2Path].filter(Boolean));
  const replaced = [old.signaturePath, old.signature2Path].filter((p): p is string => Boolean(p) && !kept.has(p) && defaultSignature.test(p!));
  const stale: string[] = [];
  for (const path of replaced) {
    const [a, b] = await Promise.all([
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("certificate->>signaturePath", path),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("certificate->>signature2Path", path),
    ]);
    // Only delete when both checks worked and found nothing.
    if (!a.error && !b.error && (a.count ?? 1) === 0 && (b.count ?? 1) === 0) stale.push(path);
  }
  if (stale.length) await supabase.storage.from("course-media").remove(stale);

  await recordAudit(user.id, "settings.certificate_default", { type: "site_settings", id: DEFAULT_SETTING_KEY }, { template: design.template });
  revalidatePath("/app/owner/settings/certificate");
  revalidatePath("/certificates", "layout");
  revalidateWorkspaces("/courses");
  return { ok: true };
}
