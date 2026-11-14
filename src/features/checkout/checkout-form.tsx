"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Building2, CreditCard, Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { startCheckoutAction, type CheckoutState } from "./actions";

const initial: CheckoutState = {};

export function CheckoutForm({
  slug,
  priceLabel,
  isFree,
  cardAvailable,
  bankAvailable,
}: {
  slug: string;
  priceLabel: string;
  isFree: boolean;
  cardAvailable: boolean;
  bankAvailable: boolean;
}) {
  const [state, formAction, pending] = useActionState(startCheckoutAction, initial);
  const [method, setMethod] = useState<string>(state.values?.method || (cardAvailable ? "payhere" : bankAvailable ? "bank_transfer" : ""));
  const payhereForm = useRef<HTMLFormElement>(null);

  // Hand over to PayHere's secure page as soon as the server has signed the order.
  useEffect(() => {
    if (state.payhere) payhereForm.current?.submit();
  }, [state.payhere]);

  if (state.payhere) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info" title="Taking you to PayHere">Complete your payment on PayHere's secure page. Don't close this tab.</Alert>
        <form ref={payhereForm} method="post" action={state.payhere.url}>
          {Object.entries(state.payhere.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <Button type="submit" size="lg" fullWidth>Continue to PayHere</Button>
        </form>
      </div>
    );
  }

  if (isFree) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="method" value="free" />
        <Button type="submit" size="lg" fullWidth loading={pending} className="rounded-full">Enrol for free</Button>
      </form>
    );
  }

  const options = [
    { value: "payhere", label: "Card", hint: "Visa, Mastercard and other options on PayHere's secure page. Instant access.", icon: CreditCard, available: cardAvailable },
    { value: "bank_transfer", label: "Bank transfer", hint: "Transfer, then upload your slip. Access after we check it (usually within a working day).", icon: Building2, available: bankAvailable },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="slug" value={slug} />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-ink">How would you like to pay?</legend>
        {options.map(({ value, label, hint, icon: Icon, available }) => (
          <label
            key={value}
            className={cn(
              "flex items-start gap-3 rounded-card border p-4",
              !available ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              method === value ? "border-brand bg-brand-soft" : "border-line hover:border-ink-muted/40",
            )}
          >
            <input
              type="radio"
              name="method"
              value={value}
              disabled={!available}
              checked={method === value}
              onChange={() => setMethod(value)}
              className="mt-1 size-4 accent-[var(--brand-primary)]"
            />
            <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-ink">{label}</span>
              <span className="block text-sm text-ink-muted">{available ? hint : "Not available right now."}</span>
            </span>
          </label>
        ))}
        {state.fieldErrors?.method?.[0] && <p className="text-xs font-medium text-danger-ink">{state.fieldErrors.method[0]}</p>}
      </fieldset>

      {method === "payhere" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="077 123 4567" defaultValue={state.values?.phone} error={state.fieldErrors?.phone?.[0]} />
          <Input label="City" name="city" autoComplete="address-level2" required defaultValue={state.values?.city} error={state.fieldErrors?.city?.[0]} />
          <p className="text-xs text-ink-muted sm:col-span-2">PayHere asks for these to protect against fraud.</p>
        </div>
      )}

      <Button type="submit" size="lg" fullWidth loading={pending} disabled={!method} className="rounded-full">
        {method === "bank_transfer" ? "Continue to bank details" : `Pay ${priceLabel}`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <Lock className="size-3.5" aria-hidden="true" /> Your card details go to PayHere directly. We never see or store them.
      </p>
    </form>
  );
}
