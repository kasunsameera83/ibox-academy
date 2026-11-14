import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, KeyRound, Landmark, Users, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { countSubmissionsToReview } from "@/lib/dal/assignments";
import { countStudents } from "@/lib/dal/people";
import { hasPermission, requireRole } from "@/lib/dal/session";
import { firstName, greeting } from "@/lib/shell-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My workspace" };

type Tile = { label: string; value: number; hint: string; href: string; icon: LucideIcon; urgent?: boolean };

export default async function StaffWorkspacePage() {
  const user = await requireRole("staff");
  const supabase = await createClient();
  const can = (key: Parameters<typeof hasPermission>[1]) => hasPermission(user, key);

  const [slips, toReview, drafts, learners] = await Promise.all([
    can("payments.read")
      ? supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "under_review").then((r) => r.count ?? 0)
      : null,
    can("courses.edit") ? countSubmissionsToReview() : null,
    can("courses.read")
      ? supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "draft").then((r) => r.count ?? 0)
      : null,
    can("students.read") ? countStudents() : null,
  ]);

  const tiles: Tile[] = [];
  if (slips !== null) tiles.push({ label: "Payments to check", value: slips, hint: "Bank slips and flagged card payments", href: "/app/staff/payments", icon: Landmark, urgent: slips > 0 });
  if (toReview !== null) tiles.push({ label: "Assignments to review", value: toReview, hint: "Oldest first", href: "/app/staff/assignments", icon: ClipboardCheck, urgent: toReview > 0 });
  if (drafts !== null) tiles.push({ label: "Draft courses", value: drafts, hint: "Not published yet", href: "/app/staff/courses?status=draft", icon: BookOpen });
  if (learners !== null) tiles.push({ label: "Learners", value: learners, hint: "Search and view accounts", href: "/app/staff/students", icon: Users });

  return (
    <>
      <PageHeader title={`${greeting()}, ${firstName(user)}`} description="Here's what needs your attention." />
      {tiles.length === 0 ? (
        <Card>
          <EmptyState
            icon={KeyRound}
            title="No work areas yet"
            description="The Owner hasn't given you any permissions. Once they do, your tools appear here and in the menu."
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <li key={t.label}>
              <Link
                href={t.href}
                className={`group flex h-full flex-col gap-3 rounded-card border bg-surface p-5 transition-colors hover:border-brand ${t.urgent ? "border-brand" : "border-line"}`}
              >
                <span className="flex items-center justify-between">
                  <span className={`flex size-10 items-center justify-center rounded-control ${t.urgent ? "bg-brand text-on-brand" : "bg-brand-soft text-brand"}`}>
                    <t.icon className="size-5" aria-hidden="true" />
                  </span>
                  <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-3xl font-semibold tracking-[-0.03em] tabular-nums text-ink">{t.value.toLocaleString("en-LK")}</span>
                  <span className="block font-semibold text-ink">{t.label}</span>
                  <span className="block text-xs text-ink-muted">{t.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
