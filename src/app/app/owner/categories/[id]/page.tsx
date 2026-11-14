import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { PageHeader } from "@/components/layouts/page-header";
import { deleteCategoryAction } from "@/features/categories/actions";
import { CategoryForm } from "@/features/categories/components/category-form";
import { getCategory } from "@/lib/dal/courses";
import { requireRole } from "@/lib/dal/session";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit category" };

const ERRORS: Record<string, string> = {
  in_use: "This category still has courses. Move those courses to another category first.",
  delete_failed: "The category couldn't be deleted. Please try again.",
};

export default async function EditCategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  await requireRole("owner");
  const { id } = await params;
  const error = param((await searchParams).error);
  const category = await getCategory(id);
  if (!category) notFound();

  return (
    <>
      <Link href="/app/owner/categories" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All categories
      </Link>
      <PageHeader title={category.name} />
      {error && ERRORS[error] && <Alert tone="danger" className="mb-4">{ERRORS[error]}</Alert>}
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader title="Details" />
          <div className="p-5">
            <CategoryForm category={category} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Delete category" description="Only empty categories can be deleted. To keep it but remove it from the website, untick “Show on the website”." />
          <div className="p-5">
            <ConfirmForm
              action={deleteCategoryAction}
              fields={{ id: category.id }}
              trigger="Delete category"
              triggerVariant="destructive"
              title={`Delete “${category.name}”?`}
              body="This removes the category permanently. Courses are not affected because only empty categories can be deleted."
              confirmLabel="Delete category"
              confirmVariant="destructive"
            />
          </div>
        </Card>
      </div>
    </>
  );
}
