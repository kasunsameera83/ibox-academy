"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BankDetails } from "@/lib/dal/orders";
import { initialFormState } from "@/lib/forms";
import { saveBankDetailsAction } from "./actions";

export function BankDetailsForm({ details }: { details: BankDetails }) {
  const [state, formAction, pending] = useActionState(saveBankDetailsAction, initialFormState);
  const v = state.values;
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Bank" name="bankName" required defaultValue={v?.bankName ?? details.bankName} placeholder="e.g. Commercial Bank" error={err("bankName")} />
        <Input label="Branch" name="branch" defaultValue={v?.branch ?? details.branch} error={err("branch")} />
        <Input label="Account name" name="accountName" required defaultValue={v?.accountName ?? details.accountName} error={err("accountName")} />
        <Input label="Account number" name="accountNumber" required inputMode="numeric" defaultValue={v?.accountNumber ?? details.accountNumber} error={err("accountNumber")} />
      </div>
      <Textarea
        label="Extra instructions (optional)"
        name="instructions"
        rows={2}
        maxLength={500}
        defaultValue={v?.instructions ?? details.instructions}
        hint="Shown under the bank details, e.g. “CEFT transfers usually arrive within minutes.”"
        error={err("instructions")}
      />
      <div><Button type="submit" loading={pending}>Save bank details</Button></div>
    </form>
  );
}
