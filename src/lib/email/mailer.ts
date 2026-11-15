import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/** App emails go out through the academy mailbox (Cloudmail SMTP). */

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 465);
  const created = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is TLS from the start; 587 upgrades with STARTTLS (required, never plain text).
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  transport = created;
  return created;
}

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

/** Sends one email. Never throws: returns false (and logs) if it couldn't be sent. */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    await getTransport().sendMail({
      from: process.env.EMAIL_FROM || `"iBox Academy" <${process.env.SMTP_USER}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return true;
  } catch (error) {
    // Log the kind of failure only: no addresses or message content.
    const code = (error as { code?: string; responseCode?: number })?.code ?? (error as { responseCode?: number })?.responseCode;
    console.error("email send failed", code ?? "unknown");
    return false;
  }
}

/** For the Integrations page: checks the server accepts our login, without sending anything. */
export async function verifyEmailConnection(): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    await getTransport().verify();
    return true;
  } catch {
    return false;
  }
}
