"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import { signUpAction } from "../actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialFormState);

  if (state.success) {
    return <Alert tone="success" title="Check your email">{state.success}</Alert>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Input label="Full name" name="fullName" autoComplete="name" required defaultValue={state.values?.fullName} error={state.fieldErrors?.fullName?.[0]} />
      <Input label="Email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email?.[0]} />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 10 characters, with a letter and a number."
        error={state.fieldErrors?.password?.[0]}
      />
      <Button type="submit" loading={pending} fullWidth size="lg">Create account</Button>
    </form>
  );
}
