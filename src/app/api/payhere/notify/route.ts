import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPayhereConfigured, verifyNotification } from "@/lib/payhere";

/**
 * PayHere server-to-server payment notification.
 * This is the ONLY place a PayHere order becomes "paid". The browser
 * return URL never unlocks a course.
 */
export async function POST(request: NextRequest) {
  if (!isPayhereConfigured()) return new NextResponse("Not configured", { status: 503 });

  const form = await request.formData();
  const p: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") p[k] = v;

  const admin = createAdminClient();
  // Keep only non-sensitive fields in the log.
  const payload = {
    order_id: p.order_id,
    payment_id: p.payment_id,
    payhere_amount: p.payhere_amount,
    payhere_currency: p.payhere_currency,
    status_code: p.status_code,
    status_message: p.status_message,
    method: p.method,
  };

  if (!verifyNotification(p)) {
    await admin.from("payment_events").insert({
      provider: "payhere",
      provider_ref: p.payment_id ?? null,
      status_code: Number.isFinite(Number(p.status_code)) ? Number(p.status_code) : null,
      signature_valid: false,
      outcome: "invalid_signature",
      payload,
    });
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const { error } = await admin.rpc("apply_payhere_notification", {
    p_reference: p.order_id,
    p_payment_id: p.payment_id ?? null,
    p_status_code: Number(p.status_code),
    p_amount: Number(p.payhere_amount),
    p_currency: p.payhere_currency,
    p_payload: payload,
  });
  if (error) {
    console.error("payhere notify failed", error.code);
    return new NextResponse("Error", { status: 500 }); // PayHere will retry
  }
  return new NextResponse("OK", { status: 200 });
}
