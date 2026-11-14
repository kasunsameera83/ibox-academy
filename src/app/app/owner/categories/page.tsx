import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layouts/page-header";
import { CategoryForm } from "@/features/categories/components/category-form";
import { categoryCourseCounts, listCategories } from "@/lib/dal/courses";
import { requireRole } from "@/lib/dal/session";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner");
  const params = await searchParams;
  const [categories, counts] = await Promise.all([listCategories(), categoryCourseCounts()]);

  return (
    <>
      <PageHeader title="Categories" description="Group courses so learners can find them. Order and visibility control the website." />
      {param(params.saved) && <Alert tone="success" className="mb-4">Category added.</Alert>}
      {param(params.deleted) && <Alert tone="success" className="mb-4">Category deleted.</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title={`All categories (${categories.length})`} />
          {categories.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No categories yet" description="Add your first category with the form." />
          ) : (
            <ul className="divide-y divide-line">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-8 text-sm tabular-nums text-ink-muted">{c.sort_order}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/owner/categories/${c.id}`} className="font-semibold text-ink hover:text-brand">
                      {c.name}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">/{c.slug} · {counts[c.id] ?? 0} course{(counts[c.id] ?? 0) === 1 ? "" : "s"}</p>
                  </div>
                  <StatusBadge status={c.is_visible ? "published" : "draft"} label={c.is_visible ? "Visible" : "Hidden"} />
                  <Link href={`/app/owner/categories/${c.id}`} className="text-sm font-semibold text-brand hover:underline">
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="Add a category" />
          <div className="p-5">
            <CategoryForm />
          </div>
        </Card>
      </div>
    </>
  );
}
