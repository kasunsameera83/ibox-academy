"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { LIMITS, parseDesign, type CertificateDesign } from "@/lib/courses/certificate";
import { requirePermission } from "@/lib/dal/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  enabled: z.boolean(),
  template: z.enum(["bold", "classic", "minimal"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid colour.").nullable(),
  heading: z.string().trim().min(1, "Add a heading.").max(LIMITS.heading, `Keep the heading under ${LIMITS.heading} characters.`),
  statement: z.string().trim().min(1, "Add the line under the name.").max(LIMITS.statement, `Keep this line under ${LIMITS.statement} characters.`),
  signerName: z.string().trim().max(LIMITS.signerName),
  signerTitle: z.string().trim().max(LIMITS.signerTitle),
  signaturePath: z.string().max(300).nullable(),
});

export async function saveCertificateDesignAction(
  courseId: string,
  input: CertificateDesign,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requirePermission("courses.edit");
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false, error: "Course not found." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the design and try again." };
  const design = parsed.data;
  if (design.signaturePath && !new RegExp(`^courses/${courseId}/signature-[a-z0-9-]+\\.(png|jpg|jpeg|webp)$`).test(design.signaturePath)) {
    return { ok: false, error: "The signature image couldn't be attached. Please upload it again." };
  }
  if (design.signaturePath && !design.signerName) {
    return { ok: false, error: "Add the signer's name to go with the signature." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("courses").select("certificate, slug").eq("id", courseId).maybeSingle();
  if (!before) return { ok: false, error: "Course not found." };

  const { error } = await supabase
    .from("courses")
    .update({ certificate: { ...design, color: design.color?.toLowerCase() ?? null }, updated_by: user.id })
    .eq("id", courseId);
  if (error) return { ok: false, error: "The design couldn't be saved. Please try again." };

  // Remove a replaced signature so old images don't pile up.
  const previous = parseDesign((before as { certificate: unknown }).certificate).signaturePath;
  if (previous && previous !== design.signaturePath) {
    await supabase.storage.from("course-media").remove([previous]);
  }

  await recordAudit(supabase, user.id, "course.certificate_design", { type: "course", id: courseId }, { template: design.template, enabled: design.enabled });
  revalidatePath(`/app/owner/courses/${courseId}`);
  revalidatePath("/certificates", "layout");
  return { ok: true };
}
