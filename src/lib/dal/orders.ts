import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OrderStatus = "pending" | "under_review" | "paid" | "failed" | "cancelled" | "partially_refunded" | "refunded";
export type PaymentMethod = "payhere" | "bank_transfer" | "free";

export type Order = {
  id: string;
  reference: string;
  student_id: string;
  course_id: string;
  course_title: string;
  amount_lkr: number;
  currency: string;
  method: PaymentMethod;
  status: OrderStatus;
  provider_payment_id: string | null;
  slip_path: string | null;
  slip_uploaded_at: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const ORDER_COLUMNS =
  "id, reference, student_id, course_id, course_title, amount_lkr, currency, method, status, provider_payment_id, slip_path, slip_uploaded_at, review_note, reviewed_at, paid_at, expires_at, created_at";

function norm<T extends { amount_lkr: number }>(o: T): T {
  return { ...o, amount_lkr: Number(o.amount_lkr) };
}

export function isExpired(order: Pick<Order, "status" | "expires_at">) {
  return order.status === "pending" && Boolean(order.expires_at) && new Date(order.expires_at!) < new Date();
}

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  payhere: "Card (PayHere)",
  bank_transfer: "Bank transfer",
  free: "Free enrolment",
};

export async function getOrderByReference(
  reference: string,
): Promise<(Order & { course_slug: string | null; course_thumbnail: string | null }) | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, course:courses(slug, thumbnail_path)`)
    .eq("reference", reference)
    .maybeSingle();
  if (!data) return null;
  const { course, ...order } = data as unknown as Order & { course: { slug: string; thumbnail_path: string | null } | null };
  return { ...norm(order), course_slug: course?.slug ?? null, course_thumbnail: course?.thumbnail_path ?? null };
}

export async function listMyOrders(userId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select(ORDER_COLUMNS).eq("student_id", userId).order("created_at", { ascending: false }).limit(100);
  return ((data ?? []) as Order[]).map(norm);
}

export type MyEnrolment = {
  id: string;
  status: "active" | "revoked" | "expired";
  starts_at: string;
  expires_at: string | null;
  course: { id: string; slug: string; title: string; subtitle: string | null; thumbnail_path: string | null } | null;
};

export async function listMyEnrolments(userId: string): Promise<MyEnrolment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrolments")
    .select("id, status, starts_at, expires_at, course:courses(id, slug, title, subtitle, thumbnail_path)")
    .eq("student_id", userId)
    .order("starts_at", { ascending: false });
  return (data ?? []) as unknown as MyEnrolment[];
}

/** Active, unexpired access to a course for this user. */
export async function hasActiveEnrolment(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrolments")
    .select("status, expires_at")
    .eq("student_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  const e = data as { status: string; expires_at: string | null } | null;
  return Boolean(e && e.status === "active" && (!e.expires_at || new Date(e.expires_at) > new Date()));
}

export type TeamOrder = Order & { student: { full_name: string | null; email: string | null } | null };

export async function listOrdersForTeam(filters: { status?: string; q?: string } = {}): Promise<TeamOrder[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, student:profiles!orders_student_id_fkey(full_name, email)`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("reference", `%${filters.q.replace(/[^A-Za-z0-9-]/g, "").slice(0, 30)}%`);
  const { data } = await query;
  return ((data ?? []) as unknown as TeamOrder[]).map(norm);
}

export type BankDetails = {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
  instructions?: string;
};

export async function getBankDetails(): Promise<BankDetails> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "bank_transfer").maybeSingle();
  return ((data as { value: BankDetails } | null)?.value ?? {}) as BankDetails;
}

export function bankDetailsComplete(b: BankDetails) {
  return Boolean(b.bankName && b.accountName && b.accountNumber);
}
