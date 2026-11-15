import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SigninEvent } from "./labels";

type HeaderSource = { get(name: string): string | null };

/** The visitor's IP as Vercel reports it, if it looks valid. */
function clientIp(h: HeaderSource): string | null {
  const raw = (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "").trim();
  return /^[0-9a-f.:]{3,45}$/i.test(raw) ? raw : null;
}

/**
 * Adds a row to the sign-in log shown on the Security page. Never throws.
 * Call it inside `after()` so signing in is never slowed down.
 */
export async function recordSignIn(event: SigninEvent, h: HeaderSource, who: { userId?: string | null; email?: string | null }) {
  try {
    const admin = createAdminClient();
    const email = who.email?.trim().toLowerCase().slice(0, 254) || null;
    let userId = who.userId ?? null;
    if (!userId && email) {
      // Link failed attempts to the account they targeted, so they're removed with it.
      const { data } = await admin.from("profiles").select("id").ilike("email", email.replace(/[\\%_]/g, "\\$&")).maybeSingle();
      userId = (data as { id: string } | null)?.id ?? null;
    }
    const { error } = await admin.from("signin_events").insert({
      event,
      user_id: userId,
      email,
      ip: clientIp(h),
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
    });
    if (error) console.error("signin log failed", error.code);
    // Keep 90 days. Pruned now and then rather than on every sign-in.
    if (Math.random() < 0.05) {
      await admin.from("signin_events").delete().lt("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString());
    }
  } catch {
    console.error("signin log failed (service key missing?)");
  }
}
