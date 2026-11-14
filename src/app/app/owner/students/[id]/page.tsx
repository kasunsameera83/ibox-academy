import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Mail } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AccountStatusControl } from "@/features/people/account-status-control";
import { EnrolmentActions } from "@/features/people/enrolment-actions";
import { GrantAccessForm } from "@/features/people/grant-access-form";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/permissions";
import { formatPrice } from "@/lib/courses/format";
import { METHOD_LABELS } from "@/lib/dal/orders";
import { getStudentDetail, listCoursesForAccess } from "@/lib/dal/people";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Learner" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole("owner");
  const { id } = await params;
  const [detail, courses] = await Promise.all([getStudentDetail(id), listCoursesForAccess()]);
  if (!detail) notFound();
  const { profile, enrolments, orders, submissions } = detail;
  const name = profile.full_name || profile.email || "Learner";
  const enrolledIds = new Set(enrolments.filter((e) => e.status === "active").map((e) => e.course?.id));
  const editable = profile.role !== "owner" && profile.id !== viewer.id;

  return (
    <>
      <Link href="/app/owner/students" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Students
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-lilac text-xl font-extrabold text-ink" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-ink">
              {name} <StatusBadge status={profile.status} />
              {profile.role !== "student" && <StatusBadge status="brand" label={ROLE_LABELS[profile.role as AppRole] ?? profile.role} tone="brand" />}
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1 hover:text-ink">
                  <Mail className="size-3.5" aria-hidden="true" /> {profile.email}
                </a>
              )}
              {" · "}Joined {dateFormat.format(new Date(profile.created_at))}
              {detail.lastActiveAt && ` · Last studied ${dateTimeFormat.format(new Date(detail.lastActiveAt))}`}
            </p>
          </div>
        </div>
        {editable && <AccountStatusControl userId={profile.id} name={name} status={profile.status} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Courses" description={enrolments.length ? `${enrolments.length} course${enrolments.length === 1 ? "" : "s"}` : undefined} />
            {enrolments.length === 0 ? (
              <p className="p-5 text-sm text-ink-muted">Not enrolled in any course yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {enrolments.map((e) => {
                  const expired = e.status === "expired" || (e.expires_at !== null && new Date(e.expires_at) < new Date());
                  return (
                    <li key={e.id} className="flex flex-col gap-3 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{e.course?.title ?? "Course"}</p>
                          <p className="text-xs text-ink-muted">
                            {e.order_id ? "Bought" : "Given by you"} {dateFormat.format(new Date(e.starts_at))}
                            {" · "}
                            {e.expires_at ? `${expired ? "Ended" : "Until"} ${dateFormat.format(new Date(e.expires_at))}` : "Lifetime"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {e.certificate && (
                            <Link href={`/certificates/${e.certificate}`} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-on-accent">
                              <Award className="size-3.5" aria-hidden="true" /> Certified
                            </Link>
                          )}
                          <StatusBadge status={e.status === "active" && expired ? "expired" : e.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Progress" aria-valuenow={e.percent} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full rounded-full bg-success" style={{ width: `${e.percent}%` }} />
                        </div>
                        <span className="w-28 shrink-0 text-right text-xs tabular-nums text-ink-muted">{e.done}/{e.total} lessons · {e.percent}%</span>
                      </div>
                      {editable && (
                        <EnrolmentActions enrolmentId={e.id} studentId={profile.id} courseTitle={e.course?.title ?? "this course"} status={e.status} expiresAt={e.expires_at} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Orders" />
            {orders.length === 0 ? (
              <p className="p-5 text-sm text-ink-muted">No orders.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-line text-xs text-ink-muted">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 font-semibold">Reference</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Course</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Amount</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                      <th scope="col" className="px-5 py-2.5 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-5 py-2.5 font-mono text-xs text-ink">{o.reference}</td>
                        <td className="max-w-48 truncate px-3 py-2.5 text-ink">{o.course_title}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink">
                          {formatPrice(o.amount_lkr)}
                          <span className="block text-xs text-ink-muted">{METHOD_LABELS[o.method as keyof typeof METHOD_LABELS] ?? o.method}</span>
                        </td>
                        <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                        <td className="px-5 py-2.5 text-xs text-ink-muted">{dateFormat.format(new Date(o.created_at))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {submissions.length > 0 && (
            <Card>
              <CardHeader title="Assignments" />
              <ul className="divide-y divide-line">
                {submissions.map((s) => (
                  <li key={s.id}>
                    <Link href={`/app/owner/assignments/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{s.lesson?.title ?? "Assignment"}</span>
                        <span className="block truncate text-xs text-ink-muted">{s.course?.title}</span>
                      </span>
                      <StatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {editable && (
          <div className="xl:sticky xl:top-24 xl:self-start">
            <Card>
              <CardHeader title="Give course access" description="For gifts, scholarships or fixing a payment problem. No order is created." />
              <div className="p-5">
                <GrantAccessForm studentId={profile.id} courses={courses.map((c) => ({ ...c, enrolled: enrolledIds.has(c.id) }))} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
