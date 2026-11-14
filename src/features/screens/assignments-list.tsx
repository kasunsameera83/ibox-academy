import Link from "next/link";
import { ClipboardCheck, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { countSubmissionsToReview, listSubmissionsForTeam, type SubmissionStatus } from "@/lib/dal/assignments";
import { type SessionUser } from "@/lib/dal/session";
import { cn, param, type SearchParams } from "@/lib/utils";


const FILTERS: { value: "" | SubmissionStatus; label: string }[] = [
  { value: "submitted", label: "To review" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "", label: "All" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

export async function AssignmentsScreen({ searchParams, user, base }: { searchParams: SearchParams; user: SessionUser; base: string }) {
  const sp = await searchParams;
  const raw = param(sp.status);
  const status = (raw === undefined ? "submitted" : FILTERS.some((f) => f.value === raw) ? raw : "submitted") as "" | SubmissionStatus;
  const [rows, toReview] = await Promise.all([listSubmissionsForTeam(status || undefined), countSubmissionsToReview()]);

  return (
    <>
      <PageHeader
        title="Assignments"
        description={toReview ? `${toReview} submission${toReview === 1 ? "" : "s"} waiting for review. Oldest first.` : "Learner submissions. You're up to date."}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          {FILTERS.map((f) => (
            <Link
              key={f.value || "all"}
              href={`${base}/assignments?status=${f.value}`}
              aria-current={status === f.value ? "page" : undefined}
              className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", status === f.value ? "bg-ink text-white" : "text-ink-muted hover:bg-canvas hover:text-ink")}
            >
              {f.label}
              {f.value === "submitted" && toReview > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-on-accent">{toReview}</span>
              )}
            </Link>
          ))}
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={status === "submitted" ? "Nothing to review" : "No submissions here"}
            description={status === "submitted" ? "New submissions appear here, and you get an alert the moment one arrives." : "Try another filter."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Learner</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Assignment</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="relative hover:bg-canvas">
                    <td className="px-5 py-3">
                      <Link href={`${base}/assignments/${r.id}`} className="font-medium text-ink after:absolute after:inset-0">
                        {r.student?.full_name || r.student?.email || "Learner"}
                      </Link>
                      {r.student?.full_name && <span className="block text-xs text-ink-muted">{r.student.email}</span>}
                    </td>
                    <td className="max-w-80 px-3 py-3">
                      <span className="flex items-center gap-1.5 font-medium text-ink">
                        <span className="truncate">{r.lesson?.title ?? "Assignment"}</span>
                        {r.has_file && <Paperclip className="size-3.5 shrink-0 text-ink-muted" aria-label="Has a file" />}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">{r.course?.title}</span>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-xs text-ink-muted">{dateFormat.format(new Date(r.submitted_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
