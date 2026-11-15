import { after, NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { notifyWelcome } from "@/lib/email/notify";
import { recordSignIn } from "@/lib/security/signin-log";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Handles Google OAuth returns (?code=) and email links (?token_hash=&type=)
 * for sign-up confirmation, password recovery and invites.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  // Welcome email for brand-new learners (email sign-up or first Google sign-in).
  const welcome = (userId: string | undefined) => {
    if (userId && (code || type === "signup")) after(() => notifyWelcome(userId));
  };

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      welcome(data.user?.id);
      // ?code= comes back from Google sign-in.
      const h = new Headers(request.headers);
      after(() => recordSignIn("google_signin", h, { userId: data.user?.id, email: data.user?.email }));
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      welcome(data.user?.id);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalid`);
}
