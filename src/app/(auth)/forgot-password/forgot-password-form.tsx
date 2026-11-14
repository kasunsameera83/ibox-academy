"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialFormState);

  if (state.success) return <Alert tone="success" title="Check your email">{state.success}</Alert>;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Input label="Email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email?.[0]} />
      <Button type="submit" loading={pending} fullWidth size="lg">Send reset link</Button>
    </form>
  );
}
