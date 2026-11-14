import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/dal/session";
import { csvResponse, toCsv } from "@/lib/reports/csv";
import { parseRange } from "@/lib/reports/range";
import { createClient } from "@/lib/supabase/server";

const local = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Colombo" }) : "";

/** Every order created in the range, for accounting. Needs exports.finance. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "exports.finance")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const range = parseRange({ range: sp.get("range") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_orders_export", { p_from: range.from, p_to: range.to });
  if (error) return NextResponse.json({ error: "Export failed. Sign in again with two-step verification." }, { status: 403 });

  type Row = {
    reference: string; created_at: string; paid_at: string | null; status: string; method: string;
    learner_name: string | null; learner_email: string | null; course_title: string;
    list_price_lkr: number; discount_lkr: number; coupon_code: string | null; amount_lkr: number; provider_payment_id: string | null;
  };
  const rows = ((data ?? []) as Row[]).map((r) => [
    r.reference, local(r.created_at), local(r.paid_at), r.status, r.method, r.learner_name, r.learner_email, r.course_title,
    Number(r.list_price_lkr), Number(r.discount_lkr), r.coupon_code, Number(r.amount_lkr), r.provider_payment_id,
  ]);
  const csv = toCsv(
    ["Reference", "Created (Sri Lanka)", "Paid (Sri Lanka)", "Status", "Method", "Learner", "Email", "Course", "Price LKR", "Discount LKR", "Promo code", "Amount LKR", "PayHere payment ID"],
    rows,
  );
  return csvResponse(`ibox-orders-${range.fromDay}-to-${range.toDay}.csv`, csv);
}
