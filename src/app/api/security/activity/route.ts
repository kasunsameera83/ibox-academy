import { NextResponse, type NextRequest } from "next/server";
import { listActivity, type ActivityRow } from "@/lib/dal/security";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser, hasPermission } from "@/lib/dal/session";
import { csvResponse, toCsv } from "@/lib/reports/csv";
import { ACTIVITY_GROUPS, PERIODS, actionLabel } from "@/lib/security/labels";

const local = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Colombo" });

/** The activity log as CSV (up to 5,000 rows). Needs audit.read. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "audit.read")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const group = ACTIVITY_GROUPS.find((g) => g.value === sp.get("group")) ?? ACTIVITY_GROUPS[0];
  const d = Number(sp.get("days"));
  const days = PERIODS.some((p) => p.value === d) ? d : 30;

  const all: ActivityRow[] = [];
  let before: number | null = null;
  for (let page = 0; page < 25; page++) {
    const rows = await listActivity({ prefixes: group.prefixes, days, before, limit: 200 });
    if (rows === null) return NextResponse.json({ error: "Sign in again with two-step verification." }, { status: 403 });
    all.push(...rows);
    if (rows.length < 200) break;
    before = rows[rows.length - 1].id;
  }

  const csv = toCsv(
    ["When (Sri Lanka)", "Who", "Role", "What", "Action code", "Item type", "Item", "Result", "Details"],
    all.map((r) => [local(r.created_at), r.actor_name, r.actor_role, actionLabel(r.action), r.action, r.target_type, r.target_id, r.outcome, JSON.stringify(r.metadata ?? {})]),
  );
  await recordAudit(user.id, "security.export_activity", undefined, { kind: group.value, days, rows: all.length });
  const day = new Date().toISOString().slice(0, 10);
  return csvResponse(`ibox-activity-${group.value}-${day}.csv`, csv);
}
