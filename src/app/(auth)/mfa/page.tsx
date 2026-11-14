import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaFlow } from "@/features/account/mfa-flow";
import { getCurrentUser } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Two-step verification", robots: { index: false } };

export default async function MfaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mfa");
  if (user.aal === "aal2") redirect("/app");

  return (
    <>
      <h1 className="type-display-md">Two-step verification</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Your account can manage payments and learner data, so it's protected with a code from an authenticator app.
      </p>
      <div className="mt-6">
        <MfaFlow />
      </div>
    </>
  );
}
