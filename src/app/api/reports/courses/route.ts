import { NextResponse, type NextRequest } from "next/server";
import { getReport } from "@/lib/dal/reports";
import { getCurrentUser, hasPermission } from "@/lib/dal/session";
import { csvResponse, toCsv } from "@/lib/reports/csv";
import { parseRange } from "@/lib/reports/range";

/** Course summary for the range (no personal data). Needs reports.read. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "reports.read")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const range = parseRange({ range: sp.get("range") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });

  const report = await getReport(range);
  if (!report) return NextResponse.json({ error: "Export failed. Sign in again with two-step verification." }, { status: 403 });

  const csv = toCsv(
    ["Course", "Status", "Revenue LKR (period)", "Paid orders (period)", "New enrolments (period)", "Active learners", "Average progress %", "Completed", "Published lessons"],
    report.courses.map((c) => [c.title, c.status, c.revenue, c.paidOrders, c.newEnrolments, c.enrolled, c.avgProgress, c.completed, c.lessons]),
  );
  return csvResponse(`ibox-courses-${range.fromDay}-to-${range.toDay}.csv`, csv);
}
