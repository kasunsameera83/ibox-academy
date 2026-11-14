import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/utils";

/**
 * PayHere Checkout API.
 * hash   = UPPER(md5(merchant_id + order_id + amount(2dp) + currency + UPPER(md5(secret))))
 * md5sig = UPPER(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + UPPER(md5(secret))))
 */
const md5 = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

function config() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const secret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!merchantId || !secret) throw new Error("PayHere is not configured.");
  const live = process.env.PAYHERE_MODE === "live";
  return {
    merchantId,
    secret,
    live,
    checkoutUrl: live ? "https://www.payhere.lk/pay/checkout" : "https://sandbox.payhere.lk/pay/checkout",
  };
}

export function isPayhereConfigured() {
  return Boolean(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET && process.env.SUPABASE_SECRET_KEY);
}

export function payhereMode(): "sandbox" | "live" {
  return process.env.PAYHERE_MODE === "live" ? "live" : "sandbox";
}

export function formatAmount(amount: number) {
  return Number(amount).toFixed(2);
}

export type PayhereCustomer = { firstName: string; lastName: string; email: string; phone: string; city: string };

export function buildCheckout(order: { reference: string; amount: number; title: string }, customer: PayhereCustomer) {
  const { merchantId, secret, checkoutUrl } = config();
  const amount = formatAmount(order.amount);
  const currency = "LKR";
  const hash = md5(merchantId + order.reference + amount + currency + md5(secret));
  const base = siteUrl();
  return {
    url: checkoutUrl,
    fields: {
      merchant_id: merchantId,
      return_url: `${base}/checkout/order/${order.reference}?from=payhere`,
      cancel_url: `${base}/checkout/order/${order.reference}?cancelled=1`,
      notify_url: `${base}/api/payhere/notify`,
      order_id: order.reference,
      items: order.title.slice(0, 100),
      currency,
      amount,
      first_name: customer.firstName.slice(0, 50),
      last_name: customer.lastName.slice(0, 50) || "-",
      email: customer.email,
      phone: customer.phone,
      address: customer.city,
      city: customer.city,
      country: "Sri Lanka",
      hash,
    } satisfies Record<string, string>,
  };
}

export function verifyNotification(p: Record<string, string>) {
  const { merchantId, secret } = config();
  if (p.merchant_id !== merchantId) return false;
  const expected = md5(p.merchant_id + p.order_id + p.payhere_amount + p.payhere_currency + p.status_code + md5(secret));
  const received = (p.md5sig ?? "").toUpperCase();
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
