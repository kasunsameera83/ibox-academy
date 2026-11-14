import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/dal/session";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <>
      <h1 className="type-display-md">Choose a new password</h1>
      <div className="mt-6">
        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="flex flex-col gap-4">
            <Alert tone="warning">Your reset link has expired or was already used.</Alert>
            <Link href="/forgot-password" className="text-center text-sm font-semibold text-brand hover:underline">
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
