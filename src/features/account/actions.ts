"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser, requireUser } from "@/lib/dal/session";
import { recordSignIn } from "@/lib/security/signin-log";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 120) {
    return { fieldErrors: { fullName: ["Enter your name (2–120 characters)."] }, values: { fullName } };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { error: "Your name couldn't be saved. Please try again.", values: { fullName } };
  revalidatePath("/", "layout");
  return { success: "Profile saved.", values: { fullName } };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: ["Choose a password you haven't used before."] } };
    if (error.code === "weak_password") return { fieldErrors: { password: ["This password is too weak. Choose another."] } };
    if (error.code === "reauthentication_needed" || error.status === 401) {
      return { error: "For your security, sign out and sign in again, then change your password straight away." };
    }
    return { error: "Your password couldn't be changed. Please try again." };
  }
  await recordAudit(user.id, "account.password_changed", { type: "profile", id: user.id });
  return { success: "Password changed. Other devices stay signed in until you sign them out below." };
}

export async function recordSecurityEventAction(action: "account.mfa_enabled" | "account.mfa_removed" | "account.signed_out_others") {
  const user = await requireUser();
  const supabase = await createClient();
  await recordAudit(user.id, action, { type: "profile", id: user.id });
}

/**
 * Logs a wrong two-step code for the Security page. The code is checked in the
 * browser by Supabase, so this only records that it failed; the account comes
 * from the signed-in session, never from the browser.
 */
export async function recordMfaFailureAction() {
  const user = await getCurrentUser();
  if (!user) return;
  const h = await headers();
  const snapshot = new Headers();
  for (const name of ["x-real-ip", "x-forwarded-for", "user-agent"]) {
    const v = h.get(name);
    if (v) snapshot.set(name, v);
  }
  after(() => recordSignIn("mfa_failed", snapshot, { userId: user.id, email: user.email }));
}
