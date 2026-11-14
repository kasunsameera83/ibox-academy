import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/brand";
import { param, safeNextPath, type SearchParams } from "@/lib/utils";
import { Divider, GoogleButton } from "../google-button";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(param(params.next));

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-ink-muted">Start learning with {brand.name} — it only takes a minute.</p>
      <div className="mt-6">
        <GoogleButton next={next} />
      </div>
      <Divider />
      <SignupForm />
      <p className="mt-4 text-center text-xs text-ink-muted">
        By creating an account you agree to our{" "}
        <Link href="/policies" className="underline hover:text-ink">terms and privacy policy</Link>.
      </p>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">Log in</Link>
      </p>
    </>
  );
}
