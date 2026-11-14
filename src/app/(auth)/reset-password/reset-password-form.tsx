"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Input label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." error={state.fieldErrors?.password?.[0]} />
      <Input label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required error={state.fieldErrors?.confirmPassword?.[0]} />
      <Button type="submit" loading={pending} fullWidth size="lg">Update password</Button>
    </form>
  );
}
