"use server";

import { requireRole } from "@/lib/dal/session";
import { isEmailConfigured, sendEmail, verifyEmailConnection } from "@/lib/email/mailer";
import { testEmail } from "@/lib/email/messages";
import { siteUrl } from "@/lib/utils";

/** Owner only: checks the mail server login, then sends a test to the Owner's own address. */
export async function sendTestEmailAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireRole("owner");
  if (!isEmailConfigured()) return { ok: false, message: "Email isn't set up yet. Add the SMTP settings on the server first." };
  if (!(await verifyEmailConnection())) {
    return { ok: false, message: "The mail server didn't accept the login. Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD." };
  }
  const sent = await sendEmail({ to: user.email, ...testEmail({ name: user.fullName || user.email, site: siteUrl() }) });
  return sent
    ? { ok: true, message: `Test email sent to ${user.email}. If it isn't in your inbox within a few minutes, check spam.` }
    : { ok: false, message: "Logged in to the mail server, but the email couldn't be sent. Check EMAIL_FROM uses the same address as SMTP_USER." };
}
