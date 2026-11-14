import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/brand";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/dal/session";
import { ResetPasswordForm } from "../reset-password/reset-password-form";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

/** Where staff invite links land: choose a password, then two-step verification. */
export default async function WelcomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Welcome to the {brand.name} team</h1>
      {user ? (
        <>
          <p className="mt-1 text-sm text-ink-muted">
            Choose a password for {user.email}. Next you'll set up two-step verification with an authenticator app.
          </p>
          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <Alert tone="warning">This invite link has expired or was already used. Ask the Owner to invite you again, or reset your password if you've already set one.</Alert>
          <Link href="/forgot-password" className="text-center text-sm font-semibold text-brand hover:underline">
            Reset my password
          </Link>
        </div>
      )}
    </>
  );
}
