import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Bucket, ReportRange } from "@/lib/reports/range";

export type ReportPoint = { start: string; revenue: number; orders: number; enrolments: number; signups: number };

export type CourseReport = {
  id: string;
  title: string;
  slug: string;
  status: string;
  revenue: number;
  paidOrders: number;
  newEnrolments: number;
  enrolled: number;
  completed: number;
  lessons: number;
  avgProgress: number;
};

export type Report = {
  bucket: Bucket;
  totals: {
    revenue: number;
    paidOrders: number;
    freeEnrolments: number;
    discount: number;
    signups: number;
    enrolments: number;
    certificates: number;
    refunded: number;
    awaitingReview: number;
  };
  series: ReportPoint[];
  courses: CourseReport[];
  methods: { method: string; orders: number; revenue: number }[];
  codes: { code: string; orders: number; revenue: number; discount: number }[];
};

/** Numbers arrive from Postgres as strings for numeric columns; make them numbers. */
function nums<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v])) as T;
}

export async function getReport(range: ReportRange): Promise<Report | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_summary", { p_from: range.from, p_to: range.to, p_bucket: range.bucket });
  if (error || !data) return null;
  const r = data as Report;
  return {
    bucket: r.bucket,
    totals: nums(r.totals),
    series: r.series.map((p) => nums(p)),
    courses: r.courses.map((c) => nums(c)),
    methods: r.methods.map((m) => nums(m)),
    codes: r.codes.map((c) => nums(c)),
  };
}
