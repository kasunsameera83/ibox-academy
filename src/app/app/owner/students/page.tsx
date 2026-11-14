import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { countStudents, listStudents } from "@/lib/dal/people";
import { requireRole, type AccountStatus } from "@/lib/dal/session";
import { cn, param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };

const FILTERS: { value: "" | AccountStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner");
  const sp = await searchParams;
  const raw = param(sp.status) ?? "";
  const status = (FILTERS.some((f) => f.value === raw) ? raw : "") as "" | AccountStatus;
  const q = param(sp.q) ?? "";
  const [students, total] = await Promise.all([listStudents({ q: q || undefined, status: status || undefined }), countStudents()]);
  const href = (s: string) => `/app/owner/students?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageHeader title="Students" description={`${total.toLocaleString("en-LK")} learner${total === 1 ? "" : "s"} have signed up.`} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          {FILTERS.map((f) => (
            <Link
              key={f.value || "all"}
              href={href(f.value)}
              aria-current={status === f.value ? "page" : undefined}
              className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", status === f.value ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-canvas hover:text-ink")}
            >
              {f.label}
            </Link>
          ))}
          <form className="ml-auto" action="/app/owner/students">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="student-q" className="sr-only">Search by name or email</label>
            <input id="student-q" name="q" type="search" defaultValue={q} placeholder="Search name or email" className="h-9 w-56 rounded-control border border-line px-3 text-sm" />
          </form>
        </div>
        {students.length === 0 ? (
          <EmptyState icon={Users} title={q || status ? "No matching learners" : "No learners yet"} description={q || status ? "Try another search or filter." : "Learners appear here as soon as they sign up."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Learner</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Courses</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.map((s) => (
                  <tr key={s.id} className="relative hover:bg-canvas">
                    <td className="px-5 py-3">
                      <Link href={`/app/owner/students/${s.id}`} className="font-medium text-ink after:absolute after:inset-0">
                        {s.full_name || s.email || "Learner"}
                      </Link>
                      {s.full_name && <span className="block text-xs text-ink-muted">{s.email}</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{s.enrolment_count}</td>
                    <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3 text-xs text-ink-muted">{dateFormat.format(new Date(s.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {students.length === 200 && <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">Showing the newest 200. Search to find someone specific.</p>}
      </Card>
    </>
  );
}
