"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { getCourseBySlug } from "@/lib/dal/courses";
import { bankDetailsComplete, getBankDetails } from "@/lib/dal/orders";
import { requirePermission, requireRole, requireUser } from "@/lib/dal/session";
import type { FormState } from "@/lib/forms";
import { buildCheckout, isPayhereConfigured } from "@/lib/payhere";
import { createClient } from "@/lib/supabase/server";

export type CheckoutState = FormState & { payhere?: { url: string; fields: Record<string, string> } };

const customerSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+94|0)?7\d{8}$/, "Enter a Sri Lankan mobile number, e.g. 077 123 4567.")),
  city: z.string().trim().min(2, "Enter your city.").max(60),
});

export async function startCheckoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await requireUser();
  const slug = String(formData.get("slug") ?? "");
  const method = String(formData.get("method") ?? "");
  const values = { phone: String(formData.get("phone") ?? ""), city: String(formData.get("city") ?? ""), method };

  const course = await getCourseBySlug(slug);
  if (!course || course.status !== "published") return { error: "This course isn't available right now.", values };
  const price = course.sale_price_lkr ?? course.price_lkr ?? 0;

  if (price > 0 && method !== "payhere" && method !== "bank_transfer") {
    return { fieldErrors: { method: ["Choose how you'd like to pay."] }, values };
  }
  if (method === "payhere" && !isPayhereConfigured()) return { error: "Card payments aren't available right now. Please use bank transfer.", values };
  if (method === "bank_transfer" && !bankDetailsComplete(await getBankDetails())) {
    return { error: "Bank transfer isn't available right now. Please pay by card.", values };
  }

  let customer: z.infer<typeof customerSchema> | null = null;
  if (price > 0 && method === "payhere") {
    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>, values };
    customer = parsed.data;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_course_id: course.id,
    p_method: price === 0 ? "free" : method,
  });
  if (error) {
    if (error.code === "23505") redirect(`/app/student/learning?enrolled=${course.slug}`);
    return { error: "We couldn't start your order. Please try again.", values };
  }
  const order = (Array.isArray(data) ? data[0] : data) as { order_id: string; reference: string; status: string; amount_lkr: number };

  if (order.status === "paid") redirect(`/checkout/order/${order.reference}`);
  if (method === "bank_transfer") redirect(`/checkout/order/${order.reference}`);

  const [firstName, ...rest] = (user.fullName || user.email.split("@")[0]).split(" ");
  const checkout = buildCheckout(
    { reference: order.reference, amount: Number(order.amount_lkr), title: course.title },
    { firstName, lastName: rest.join(" "), email: user.email, phone: customer!.phone, city: customer!.city },
  );
  return { payhere: checkout, values };
}

export async function submitSlipAction(orderId: string, reference: string, path: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_bank_slip", { p_order_id: orderId, p_path: path });
  if (error) return { ok: false, error: "The slip couldn't be attached to your order. Please try again." };
  revalidatePath(`/checkout/order/${reference}`);
  revalidatePath("/app/owner/payments");
  return { ok: true };
}

export async function getOrderStatusAction(reference: string): Promise<string | null> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("status").eq("reference", reference).maybeSingle();
  return (data as { status: string } | null)?.status ?? null;
}

export async function reviewBankTransferAction(formData: FormData) {
  await requirePermission("payments.verify_bank_transfer");
  const orderId = String(formData.get("orderId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (decision === "reject" && !note) redirect(`/app/owner/payments?error=reason&order=${orderId}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_bank_transfer", {
    p_order_id: orderId,
    p_approve: decision === "approve",
    p_note: note || null,
  });
  if (error) redirect(`/app/owner/payments?error=review`);
  revalidatePath("/app/owner/payments");
  revalidatePath("/app/owner/orders");
  redirect(`/app/owner/payments?done=${decision}`);
}

const bankSchema = z.object({
  bankName: z.string().trim().min(2, "Enter the bank name.").max(80),
  accountName: z.string().trim().min(2, "Enter the account name.").max(120),
  accountNumber: z.string().trim().regex(/^[0-9 -]{6,30}$/, "Enter the account number (digits only)."),
  branch: z.string().trim().max(80),
  instructions: z.string().trim().max(500),
});

export async function saveBankDetailsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("owner");
  const values = Object.fromEntries(
    ["bankName", "accountName", "accountNumber", "branch", "instructions"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = bankSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>, values };
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "bank_transfer", value: parsed.data, is_public: true, updated_by: user.id });
  if (error) return { error: "The bank details couldn't be saved.", values };
  await recordAudit(supabase, user.id, "settings.bank_details_updated", { type: "site_settings", id: "bank_transfer" });
  revalidatePath("/app/owner/settings/payments");
  return { success: "Bank details saved.", values };
}
