"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Building2, CreditCard, Lock, Tag, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/courses/format";
import { cn } from "@/lib/utils";
import { previewCouponAction, type CouponPreview } from "@/features/promotions/actions";
import { startCheckoutAction, type CheckoutState } from "./actions";

const initial: CheckoutState = {};

/** "Have a promo code?" — checks the code on the server and shows the new total. */
function PromoCode({
  slug,
  initialCode,
  applied,
  onApplied,
  serverError,
}: {
  slug: string;
  initialCode: string;
  applied: CouponPreview | null;
  onApplied: (p: CouponPreview | null) => void;
  serverError?: string;
}) {
  const [open, setOpen] = useState(Boolean(initialCode));
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [checking, start] = useTransition();
  const autoTried = useRef(false);

  const apply = (value: string) => {
    setError(null);
    if (!value.trim()) return setError("Enter a code.");
    start(async () => {
      const res = await previewCouponAction(slug, value);
      if (!res.ok) {
        onApplied(null);
        return setError(res.error);
      }
      onApplied(res.preview);
    });
  };

  // A code in the link (?code=LAUNCH20) is checked straight away.
  useEffect(() => {
    if (initialCode && !autoTried.current) {
      autoTried.current = true;
      apply(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  if (applied) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-success/40 bg-success-soft px-4 py-3">
        <Tag className="size-4 shrink-0 text-success-ink" aria-hidden="true" />
        <p className="flex-1 text-sm text-success-ink">
          <span className="font-bold">{applied.code}</span> applied. You save {formatPrice(applied.discount)}.
        </p>
        <button
          type="button"
          onClick={() => {
            onApplied(null);
            setCode("");
          }}
          aria-label="Remove code"
          className="flex size-7 items-center justify-center rounded-control text-success-ink hover:bg-surface"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-sm font-semibold text-brand hover:underline">
        Have a promo code?
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="promo-code" className="text-sm font-semibold text-ink">Promo code</label>
      <div className="flex gap-2">
        <input
          id="promo-code"
          value={code}
          maxLength={30}
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply(code);
            }
          }}
          aria-invalid={Boolean(error || serverError)}
          aria-describedby={error || serverError ? "promo-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-control border border-line px-3 font-mono text-sm uppercase tracking-wide"
        />
        <Button type="button" variant="secondary" loading={checking} onClick={() => apply(code)}>Apply</Button>
      </div>
      {(error || serverError) && <p id="promo-error" className="text-xs font-medium text-danger-ink">{error ?? serverError}</p>}
    </div>
  );
}

export function CheckoutForm({
  slug,
  listPrice,
  isFree,
  cardAvailable,
  bankAvailable,
  initialCode = "",
}: {
  slug: string;
  /** Price before any promo code. */
  listPrice: number;
  isFree: boolean;
  cardAvailable: boolean;
  bankAvailable: boolean;
  /** From a share link like /checkout/course?code=LAUNCH20. */
  initialCode?: string;
}) {
  const [state, formAction, pending] = useActionState(startCheckoutAction, initial);
  const [applied, setApplied] = useState<CouponPreview | null>(null);
  const total = applied ? applied.total : listPrice;
  const priceLabel = formatPrice(total);
  const freeWithCode = !isFree && total === 0;
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

  if (freeWithCode) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="method" value="free" />
        <input type="hidden" name="coupon" value={applied?.code ?? ""} />
        <PromoCode slug={slug} initialCode={initialCode} applied={applied} onApplied={setApplied} serverError={state.fieldErrors?.coupon?.[0]} />
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

      <input type="hidden" name="coupon" value={applied?.code ?? ""} />
      <PromoCode slug={slug} initialCode={initialCode} applied={applied} onApplied={setApplied} serverError={state.fieldErrors?.coupon?.[0]} />
      {applied && (
        <dl className="flex flex-col gap-1 rounded-card bg-canvas px-4 py-3 text-sm">
          <div className="flex justify-between text-ink-muted"><dt>Price</dt><dd>{formatPrice(applied.listPrice)}</dd></div>
          <div className="flex justify-between text-success-ink"><dt>Code {applied.code}</dt><dd>−{formatPrice(applied.discount)}</dd></div>
          <div className="flex justify-between font-extrabold text-ink"><dt>You pay</dt><dd>{formatPrice(applied.total)}</dd></div>
        </dl>
      )}

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
