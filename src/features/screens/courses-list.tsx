import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { CreateCourseForm } from "@/features/courses/components/create-course-form";
import { listCoursesForTeam } from "@/lib/dal/courses";
import { hasPermission, type SessionUser } from "@/lib/dal/session";
import { formatPrice, mediaUrl } from "@/lib/courses/format";
import { cn, param, type SearchParams } from "@/lib/utils";


const FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
  { value: "archived", label: "Archived" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" });

export async function CoursesScreen({ searchParams, user, base }: { searchParams: SearchParams; user: SessionUser; base: string }) {
  const params = await searchParams;
  const status = param(params.status) ?? "";
  const courses = await listCoursesForTeam({ status: status || undefined });

  return (
    <>
      <PageHeader title="Courses" description="Create, edit and publish your courses." />
      {param(params.deleted) && <Alert tone="success" className="mb-4">Draft course deleted.</Alert>}

      {hasPermission(user, "courses.create") && (
        <Card className="mb-6">
          <CardHeader title="New course" />
          <div className="p-5"><CreateCourseForm /></div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `${base}/courses?status=${f.value}` : `${base}/courses`}
              aria-current={status === f.value ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold",
                status === f.value ? "bg-ink text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={status ? "No courses with this status" : "No courses yet"}
            description={status ? "Try another filter." : "Create your first course above. It stays private until you publish it."}
          />
        ) : (
          <ul className="divide-y divide-line">
            {courses.map((c) => {
              const thumb = mediaUrl(c.thumbnail_path);
              return (
                <li key={c.id}>
                  <Link href={`${base}/courses/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas">
                    <div className="hidden aspect-video w-24 shrink-0 overflow-hidden rounded-control bg-brand-soft sm:block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {thumb && <img src={thumb} alt="" className="size-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{c.title}</p>
                      <p className="text-xs text-ink-muted">
                        {c.category?.name ?? "No category"} · {c.lesson_count} lesson{c.lesson_count === 1 ? "" : "s"} · Updated {dateFormat.format(new Date(c.updated_at))}
                      </p>
                    </div>
                    <span className="hidden text-sm font-semibold text-ink sm:block">{formatPrice(c.sale_price_lkr ?? c.price_lkr)}</span>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
