"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { createTicketAction, type NewTicketState } from "./actions";

const CATEGORIES = [
  { value: "payment", label: "Payment" },
  { value: "access", label: "Course access" },
  { value: "technical", label: "Technical problem" },
  { value: "certificate", label: "Certificate" },
  { value: "refund", label: "Refund" },
  { value: "other", label: "Something else" },
];

export function NewTicketForm({ orders, defaultCategory, defaultOrderId }: {
  orders: { id: string; reference: string; course_title: string }[]; defaultCategory?: string; defaultOrderId?: string;
}) {
  const [state, action] = useActionState<NewTicketState, FormData>(createTicketAction, {});
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {e.form && <Alert tone="danger">{e.form[0]}</Alert>}
      <Select
        label="What's it about?"
        name="category"
        required
        placeholder="Choose one"
        defaultValue={v.category ?? defaultCategory ?? ""}
        options={CATEGORIES}
        error={e.category?.[0]}
      />
      {orders.length > 0 && (
        <Select
          label="Which order? (optional)"
          name="orderId"
          defaultValue={v.orderId ?? defaultOrderId ?? ""}
          options={[{ value: "", label: "Not about an order" }, ...orders.map((o) => ({ value: o.id, label: `${o.reference} · ${o.course_title}` }))]}
          hint="Linking the order lets us check your payment faster."
        />
      )}
      <Input label="Subject" name="subject" required maxLength={120} defaultValue={v.subject} error={e.subject?.[0]} placeholder="My bank transfer isn't approved yet" />
      <Textarea
        label="How can we help?"
        name="body"
        required
        rows={7}
        maxLength={5000}
        defaultValue={v.body}
        error={e.body?.[0]}
        hint="Include what you tried and any error message. Never send your password or card number."
      />
      <SubmitButton className="self-start" pendingText="Sending…">Send request</SubmitButton>
    </form>
  );
}
