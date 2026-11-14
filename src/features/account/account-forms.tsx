"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import { changePasswordAction, updateProfileAction } from "./actions";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormFeedback state={state} />
      <Input label="Full name" name="fullName" autoComplete="name" defaultValue={state.values?.fullName ?? fullName} error={state.fieldErrors?.fullName?.[0]} />
      <Input label="Email" name="email" value={email} readOnly disabled hint="Contact support to change your email address." />
      <div><Button type="submit" loading={pending}>Save profile</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormFeedback state={state} />
      <Input label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with a letter and a number." error={state.fieldErrors?.password?.[0]} />
      <Input label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" error={state.fieldErrors?.confirmPassword?.[0]} />
      <div><Button type="submit" loading={pending}>Change password</Button></div>
    </form>
  );
}
