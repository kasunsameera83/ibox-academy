"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialFormState } from "@/lib/forms";
import { signInAction } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialFormState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email?.[0]}
      />
      <div className="relative">
        <Input
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          className="pr-11"
          error={state.fieldErrors?.password?.[0]}
          labelAction={
            <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
              Forgot password?
            </Link>
          }
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-1 top-[30px] flex size-9 items-center justify-center rounded-control text-ink-muted hover:text-ink"
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <Button type="submit" loading={pending} fullWidth size="lg">
        Log in
      </Button>
    </form>
  );
}
