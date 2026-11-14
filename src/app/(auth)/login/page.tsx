import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { brand } from "@/brand";
import { param, safeNextPath, type SearchParams } from "@/lib/utils";
import { Divider, GoogleButton } from "../google-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

const MESSAGES: Record<string, { tone: "danger" | "success" | "info"; text: string }> = {
  link_invalid: { tone: "danger", text: "That link is invalid or has expired. Please try again." },
  oauth: { tone: "danger", text: "Google sign-in couldn't be started. Please try again." },
  account: { tone: "danger", text: "This account is not active. Please contact support." },
};

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(param(params.next));
  const errorKey = param(params.error);
  const message = errorKey ? MESSAGES[errorKey] : undefined;

  return (
    <>
      <h1 className="type-display-md">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-muted">Log in to continue learning with {brand.name}.</p>

      <div className="mt-6 flex flex-col gap-4">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        {param(params.signed_out) && <Alert tone="success">You've been signed out.</Alert>}
        <GoogleButton next={next} />
      </div>
      <Divider />
      <LoginForm next={next} />

      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href={`/signup${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
