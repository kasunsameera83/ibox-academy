import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DiscountType = "percent" | "fixed";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  per_learner_limit: number;
  applies_to_all: boolean;
  is_active: boolean;
  created_at: string;
  course_ids: string[];
};

export type CouponStats = {
  /** Paid orders that used the code. */
  paidUses: number;
  /** Uses that currently count toward the limit (paid, in review, or open). */
  liveUses: number;
  revenue: number;
  discountGiven: number;
};

export type CouponState = "active" | "scheduled" | "expired" | "paused" | "used_up";

export function couponState(c: Coupon, stats: CouponStats): CouponState {
  const now = Date.now();
  if (!c.is_active) return "paused";
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return "expired";
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return "scheduled";
  if (c.max_redemptions !== null && stats.liveUses >= c.max_redemptions) return "used_up";
  return "active";
}

const COLUMNS =
  "id, code, description, discount_type, discount_value, starts_at, ends_at, max_redemptions, per_learner_limit, applies_to_all, is_active, created_at, coupon_courses(course_id)";

type Raw = Omit<Coupon, "course_ids" | "discount_value"> & { discount_value: number | string; coupon_courses: { course_id: string }[] };

function normalise(r: Raw): Coupon {
  const { coupon_courses, ...rest } = r;
  return { ...rest, discount_value: Number(r.discount_value), course_ids: (coupon_courses ?? []).map((x) => x.course_id) };
}

type OrderRow = { coupon_id: string; status: string; amount_lkr: number | string; discount_lkr: number | string; expires_at: string | null };

function statsFor(rows: OrderRow[]): CouponStats {
  const now = Date.now();
  const paid = rows.filter((o) => o.status === "paid" || o.status === "partially_refunded");
  return {
    paidUses: paid.length,
    liveUses: rows.filter(
      (o) =>
        ["paid", "under_review", "partially_refunded"].includes(o.status) ||
        (o.status === "pending" && (!o.expires_at || new Date(o.expires_at).getTime() > now)),
    ).length,
    revenue: paid.reduce((s, o) => s + Number(o.amount_lkr), 0),
    discountGiven: paid.reduce((s, o) => s + Number(o.discount_lkr), 0),
  };
}

export async function listCoupons(): Promise<{ coupon: Coupon; stats: CouponStats; state: CouponState }[]> {
  const supabase = await createClient();
  const [{ data: coupons }, { data: orders }] = await Promise.all([
    supabase.from("coupons").select(COLUMNS).order("created_at", { ascending: false }),
    supabase.from("orders").select("coupon_id, status, amount_lkr, discount_lkr, expires_at").not("coupon_id", "is", null).limit(5000),
  ]);
  const byCoupon = new Map<string, OrderRow[]>();
  for (const o of (orders ?? []) as OrderRow[]) byCoupon.set(o.coupon_id, [...(byCoupon.get(o.coupon_id) ?? []), o]);
  return ((coupons ?? []) as unknown as Raw[]).map((r) => {
    const coupon = normalise(r);
    const stats = statsFor(byCoupon.get(coupon.id) ?? []);
    return { coupon, stats, state: couponState(coupon, stats) };
  });
}

export type CouponOrder = {
  id: string;
  reference: string;
  course_title: string;
  amount_lkr: number;
  discount_lkr: number;
  status: string;
  created_at: string;
  student: { full_name: string | null; email: string | null } | null;
};

export async function getCoupon(id: string): Promise<{ coupon: Coupon; stats: CouponStats; state: CouponState; orders: CouponOrder[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data }, { data: orders }] = await Promise.all([
    supabase.from("coupons").select(COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, reference, course_title, amount_lkr, discount_lkr, status, created_at, expires_at, coupon_id, student:profiles!orders_student_id_fkey(full_name, email)")
      .eq("coupon_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (!data) return null;
  const coupon = normalise(data as unknown as Raw);
  const rows = (orders ?? []) as unknown as (CouponOrder & OrderRow)[];
  const stats = statsFor(rows);
  return {
    coupon,
    stats,
    state: couponState(coupon, stats),
    orders: rows.map((o) => ({ ...o, amount_lkr: Number(o.amount_lkr), discount_lkr: Number(o.discount_lkr) })),
  };
}
