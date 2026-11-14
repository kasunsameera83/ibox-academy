import type { Metadata } from "next";
import { Award, BookOpen, Clock, Compass } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { requireRole } from "@/lib/dal/session";
import { firstName, greeting } from "@/lib/shell-user";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "My learning" };

const stats = [
  { label: "Hours learned", value: "0", icon: Clock },
  { label: "Courses", value: "0", icon: BookOpen },
  { label: "Certificates", value: "0", icon: Award },
];

export default async function StudentOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("student", "owner");
  const params = await searchParams;

  return (
    <>
      {param(params.password) === "updated" && <Alert tone="success" className="mb-6">Your password has been updated.</Alert>}
      <PageHeader title={`${greeting()}, ${firstName(user)}`} description="Pick up where you left off, or find something new to learn." />

      <Card>
        <EmptyState
          icon={Compass}
          title="Start your first course"
          description="You haven't enrolled in a course yet. Explore the catalogue to find one that fits your goals."
          action={<ButtonLink href="/courses">Explore courses</ButtonLink>}
        />
      </Card>

      <section aria-label="Your learning" className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex items-center gap-4 p-5">
            <span className="flex size-10 items-center justify-center rounded-control bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold text-ink">{value}</p>
              <p className="text-sm text-ink-muted">{label}</p>
            </div>
          </Card>
        ))}
      </section>

      <Card className="mt-6">
        <CardHeader title="My courses" />
        <EmptyState title="No courses yet" description="Courses you enrol in will appear here with your progress." />
      </Card>
    </>
  );
}
