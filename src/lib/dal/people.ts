import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus } from "./session";

function cleanSearch(q: string) {
  return q.replace(/[^\p{L}\p{N}\s@._+-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

// ---------------------------------------------------------------- students

export type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: AccountStatus;
  created_at: string;
  enrolment_count: number;
};

export async function listStudents(filters: { q?: string; status?: AccountStatus } = {}): Promise<StudentRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, status, created_at, enrolments!enrolments_student_id_fkey(count)")
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .limit(200);
  const q = filters.q ? cleanSearch(filters.q) : "";
  if (q) query = query.or(`full_name.ilike."%${q}%",email.ilike."%${q}%"`);
  if (filters.status) query = query.eq("status", filters.status);
  const { data } = await query;
  type Row = Omit<StudentRow, "enrolment_count"> & { enrolments: { count: number }[] };
  return ((data ?? []) as unknown as Row[]).map(({ enrolments, ...r }) => ({ ...r, enrolment_count: enrolments?.[0]?.count ?? 0 }));
}

export async function countStudents(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student");
  return count ?? 0;
}

export type StudentEnrolment = {
  id: string;
  status: "active" | "revoked" | "expired";
  starts_at: string;
  expires_at: string | null;
  order_id: string | null;
  course: { id: string; title: string; slug: string } | null;
  done: number;
  total: number;
  percent: number;
  certificate: string | null;
};

export type StudentDetail = {
  profile: { id: string; full_name: string | null; email: string | null; role: string; status: AccountStatus; created_at: string };
  lastActiveAt: string | null;
  enrolments: StudentEnrolment[];
  orders: { id: string; reference: string; course_title: string; amount_lkr: number; method: string; status: string; created_at: string }[];
  submissions: { id: string; status: string; submitted_at: string; lesson: { title: string } | null; course: { title: string } | null }[];
};

export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, full_name, email, role, status, created_at").eq("id", id).maybeSingle();
  if (!profile) return null;

  const [{ data: enrolments }, { data: progress }, { data: certificates }, { data: orders }, { data: submissions }] = await Promise.all([
    supabase
      .from("enrolments")
      .select("id, status, starts_at, expires_at, order_id, course:courses(id, title, slug, lessons(id, status))")
      .eq("student_id", id)
      .order("starts_at", { ascending: false }),
    supabase.from("lesson_progress").select("course_id, lesson_id, completed_at, last_viewed_at").eq("student_id", id),
    supabase.from("certificates").select("course_id, code").eq("student_id", id),
    supabase
      .from("orders")
      .select("id, reference, course_title, amount_lkr, method, status, created_at")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("assignment_submissions")
      .select("id, status, submitted_at, lesson:lessons(title), course:courses(title)")
      .eq("student_id", id)
      .order("submitted_at", { ascending: false })
      .limit(50),
  ]);

  const progressRows = (progress ?? []) as { course_id: string; lesson_id: string; completed_at: string | null; last_viewed_at: string }[];
  const certs = new Map(((certificates ?? []) as { course_id: string; code: string }[]).map((c) => [c.course_id, c.code]));
  type RawEnrolment = Omit<StudentEnrolment, "course" | "done" | "total" | "percent" | "certificate"> & {
    course: { id: string; title: string; slug: string; lessons: { id: string; status: string }[] } | null;
  };

  return {
    profile: profile as StudentDetail["profile"],
    lastActiveAt: progressRows.reduce<string | null>((latest, p) => (!latest || p.last_viewed_at > latest ? p.last_viewed_at : latest), null),
    enrolments: ((enrolments ?? []) as unknown as RawEnrolment[]).map((e) => {
      const published = new Set((e.course?.lessons ?? []).filter((l) => l.status === "published").map((l) => l.id));
      const done = progressRows.filter((p) => p.course_id === e.course?.id && p.completed_at && published.has(p.lesson_id)).length;
      return {
        ...e,
        course: e.course ? { id: e.course.id, title: e.course.title, slug: e.course.slug } : null,
        done,
        total: published.size,
        percent: published.size ? Math.min(100, Math.floor((done * 100) / published.size)) : 0,
        certificate: e.course ? certs.get(e.course.id) ?? null : null,
      };
    }),
    orders: ((orders ?? []) as StudentDetail["orders"]).map((o) => ({ ...o, amount_lkr: Number(o.amount_lkr) })),
    submissions: (submissions ?? []) as unknown as StudentDetail["submissions"],
  };
}

export async function listCoursesForAccess(): Promise<{ id: string; title: string; status: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id, title, status").neq("status", "archived").order("title");
  return (data ?? []) as { id: string; title: string; status: string }[];
}

// ---------------------------------------------------------------- staff

export type StaffMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: AccountStatus;
  created_at: string;
  permissions: string[];
  /** From Supabase Auth: null means they haven't accepted the invite yet. */
  lastSignInAt: string | null;
  invitePending: boolean;
};

export async function listStaff(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, status, created_at, staff_permissions!staff_permissions_user_id_fkey(permission_key)")
    .eq("role", "staff")
    .order("created_at", { ascending: true });
  type Row = Omit<StaffMember, "permissions" | "lastSignInAt" | "invitePending"> & { staff_permissions: { permission_key: string }[] };
  const rows = (data ?? []) as unknown as Row[];

  // Sign-in details live in Supabase Auth, which only the server key can read.
  let authInfo = new Map<string, { last_sign_in_at: string | null; email_confirmed_at: string | null }>();
  try {
    const admin = createAdminClient();
    const results = await Promise.all(rows.map((r) => admin.auth.admin.getUserById(r.id)));
    authInfo = new Map(
      results
        .map((res) => res.data.user)
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((u) => [u.id, { last_sign_in_at: u.last_sign_in_at ?? null, email_confirmed_at: u.email_confirmed_at ?? null }]),
    );
  } catch {
    // Without the server key we just can't show sign-in dates.
  }

  return rows.map(({ staff_permissions, ...r }) => {
    const info = authInfo.get(r.id);
    return {
      ...r,
      permissions: (staff_permissions ?? []).map((p) => p.permission_key).sort(),
      lastSignInAt: info?.last_sign_in_at ?? null,
      invitePending: info ? !info.last_sign_in_at : false,
    };
  });
}
