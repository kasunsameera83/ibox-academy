import type { Metadata } from "next";
import { BarChart3, BookPlus, Globe, Inbox } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { requireRole } from "@/lib/dal/session";
import { firstName, greeting } from "@/lib/shell-user";

export const metadata: Metadata = { title: "Owner overview" };

const kpis = ["Revenue (LKR)", "Paid orders", "New students", "Active courses"];

export default async function OwnerOverviewPage() {
  const user = await requireRole("owner");

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(user)}`}
        description="Platform overview"
        actions={
          <>
            <ButtonLink href="/app/owner/website" variant="secondary" size="sm"><Globe className="size-4" aria-hidden="true" />Edit website</ButtonLink>
            <ButtonLink href="/app/owner/courses" size="sm"><BookPlus className="size-4" aria-hidden="true" />Create course</ButtonLink>
          </>
        }
      />

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((label) => (
          <Card key={label} className="p-5">
            <p className="text-sm font-medium text-ink-muted">{label}</p>
            <p className="mt-2 text-sm text-ink-muted">No data yet</p>
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Revenue and enrolments" description="Trends appear once your first orders come in." />
          <EmptyState icon={BarChart3} title="No sales yet" description="Publish your first course to start taking orders." />
        </Card>
        <Card>
          <CardHeader title="Needs your attention" description="Course reviews, bank transfers, refunds and support." />
          <EmptyState icon={Inbox} title="You're all caught up" description="Pending actions will appear here." />
        </Card>
      </div>
    </>
  );
}
