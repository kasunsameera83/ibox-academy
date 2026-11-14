import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CertificateDesigner } from "@/features/certificates/certificate-designer";
import { CurriculumEditor } from "@/features/courses/components/curriculum-editor";
import { IntroVideoCard } from "@/features/courses/components/intro-video-card";
import { OutcomesForm } from "@/features/courses/components/outcomes-form";
import { OverviewForm } from "@/features/courses/components/overview-form";
import { PricingForm } from "@/features/courses/components/pricing-form";
import { PublishPanel } from "@/features/courses/components/publish-panel";
import { SeoForm } from "@/features/courses/components/seo-form";
import { ThumbnailUploader } from "@/features/courses/components/thumbnail-uploader";
import { VideoHostingNotice } from "@/features/courses/components/video-hosting-notice";
import { isBunnyConfigured } from "@/lib/bunny";
import { parseDesign } from "@/lib/courses/certificate";
import { publishChecklist } from "@/lib/courses/checklist";
import { formatDuration, mediaUrl } from "@/lib/courses/format";
import { curriculumStats } from "@/lib/courses/lessons";
import { getCourseForEditor, listCategories } from "@/lib/dal/courses";
import { hasPermission, type SessionUser } from "@/lib/dal/session";
import { cn, param, type SearchParams } from "@/lib/utils";


const STEPS = [
  { key: "overview", label: "Overview", description: "Course image, intro video, title, description and category." },
  { key: "outcomes", label: "Outcomes", description: "What learners will be able to do, who it's for and what they need." },
  { key: "curriculum", label: "Curriculum", description: "Sections, lessons, videos and free previews." },
  { key: "pricing", label: "Pricing & access", description: "Price in LKR and how long learners keep access." },
  { key: "certificate", label: "Certificate", description: "Design the certificate learners get when they finish every lesson and every assignment is approved." },
  { key: "seo", label: "SEO", description: "How the course appears in Google and when shared." },
  { key: "publish", label: "Publish", description: "Final checks, then go live." },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export async function CourseEditorScreen({ params, searchParams, user, base }: { params: Promise<{ id: string }>; searchParams: SearchParams; user: SessionUser; base: string }) {
  const { id } = await params;
  const sp = await searchParams;
  const requested = param(sp.step) as StepKey | undefined;
  const step: StepKey = STEPS.some((s) => s.key === requested) ? (requested as StepKey) : "overview";

  const [course, categories] = await Promise.all([getCourseForEditor(id), listCategories()]);
  if (!course) notFound();

  const checklist = publishChecklist(course);
  const doneSteps = new Set(
    STEPS.filter((s) => {
      const items = checklist.filter((i) => i.step === s.key);
      return items.length > 0 && items.every((i) => i.done);
    }).map((s) => s.key),
  );
  const stats = curriculumStats(course.sections);
  const current = STEPS.find((s) => s.key === step)!;

  return (
    <>
      <Link href={`${base}/courses`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All courses
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{course.title}</h1>
        <StatusBadge status={course.status} />
        <span className="text-sm text-ink-muted">
          {stats.lessonCount} lesson{stats.lessonCount === 1 ? "" : "s"}
          {stats.totalSeconds ? `, ${formatDuration(stats.totalSeconds)}` : ""}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Course builder steps">
          <ol className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {STEPS.map((s, i) => (
              <li key={s.key} className="shrink-0">
                <Link
                  href={`?step=${s.key}`}
                  aria-current={s.key === step ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium",
                    s.key === step ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      doneSteps.has(s.key) ? "bg-success text-white" : s.key === step ? "bg-brand text-on-brand" : "bg-line text-ink-muted",
                    )}
                  >
                    {doneSteps.has(s.key) ? <Check className="size-3.5" aria-label="complete" /> : i + 1}
                  </span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <Card className="min-w-0 p-5 sm:p-7">
          <h2 className="text-lg font-bold text-ink">{current.label}</h2>
          <p className="mb-6 text-sm text-ink-muted">{current.description}</p>

          {step === "overview" && (
            <div className="flex flex-col gap-8">
              <ThumbnailUploader courseId={course.id} currentUrl={mediaUrl(course.thumbnail_path)} />
              <IntroVideoCard course={course} isOwner={user.role === "owner"} canUpload={hasPermission(user, "courses.upload")} />
              <OverviewForm course={course} categories={categories} />
            </div>
          )}
          {step === "outcomes" && <OutcomesForm course={course} />}
          {step === "curriculum" && (
            <CurriculumEditor
              courseId={course.id}
              lessonsBase={`${base}/courses/${course.id}/lessons`}
              sections={course.sections}
              videoNotice={<VideoHostingNotice connected={isBunnyConfigured()} isOwner={user.role === "owner"} />}
            />
          )}
          {step === "pricing" && <PricingForm course={course} />}
          {step === "certificate" && <CertificateDesigner courseId={course.id} courseTitle={course.title} initial={parseDesign(course.certificate)} />}
          {step === "seo" && <SeoForm course={course} />}
          {step === "publish" && (
            <PublishPanel
              course={course}
              canPublish={hasPermission(user, "courses.publish")}
              isOwner={user.role === "owner"}
              done={param(sp.done)}
              error={param(sp.error)}
            />
          )}
        </Card>
      </div>
    </>
  );
}
