"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { recordSignIn } from "@/lib/security/signin-log";
import type { SigninEvent } from "@/lib/security/labels";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";
import { safeNextPath, siteUrl } from "@/lib/utils";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

/** Logs a sign-in event for the Security page, after the response is sent. */
async function logSignIn(event: SigninEvent, who: { userId?: string | null; email?: string | null }) {
  const h = await headers();
  const snapshot = new Headers();
  for (const name of ["x-real-ip", "x-forwarded-for", "user-agent"]) {
    const v = h.get(name);
    if (v) snapshot.set(name, v);
  }
  after(() => recordSignIn(event, snapshot, who));
}

function isRateLimited(error: { status?: number; code?: string }) {
  return error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit";
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (!isRateLimited(error)) await logSignIn("signin_failed", { email: parsed.data.email });
    if (isRateLimited(error)) {
      return { error: "Too many attempts. Please wait a few minutes and try again.", values: { email } };
    }
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email address first. Check your inbox for the link.", values: { email } };
    }
    // Generic message: never reveal whether an account exists.
    return { error: "Email or password is incorrect.", values: { email } };
  }
  await logSignIn("signin", { userId: data.user?.id, email: parsed.data.email });

  redirect(safeNextPath(formData.get("next")));
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = signUpSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/app`,
      // Display name only. Roles are never taken from user metadata.
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    if (isRateLimited(error)) return { error: "Too many sign-up attempts. Please try again later.", values };
    if (error.code === "weak_password") {
      return { fieldErrors: { password: ["This password is too weak or has appeared in a data breach. Choose another."] }, values };
    }
    return { error: "We couldn't create your account. Please try again.", values };
  }

  return {
    success: `We've sent a confirmation link to ${parsed.data.email}. Open it to activate your account.`,
  };
}

export async function googleSignInAction(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });

  if (error && isRateLimited(error)) {
    return { error: "Too many requests. Please wait a few minutes and try again.", values: { email } };
  }

  if (!error) await logSignIn("password_reset_requested", { email: parsed.data.email });
  // Same message whether or not the account exists.
  return { success: "If an account exists for that email, we've sent a password reset link." };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return { error: "Your reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: ["Choose a password you haven't used before."] } };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: ["This password is too weak. Choose another."] } };
    }
    return { error: "We couldn't update your password. Please try again." };
  }

  redirect("/app?password=updated");
}

export async function signOutAction() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) await logSignIn("signout", { userId: data.claims.sub });
  await supabase.auth.signOut();
  redirect("/login?signed_out=1");
}
