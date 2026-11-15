import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/page-header";
import { NewTicketForm } from "@/features/support/new-ticket-form";
import { listMyOrdersForSupport } from "@/lib/dal/support";
import { requireRole } from "@/lib/dal/session";
import { param, type SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Ask for help" };

export default async function NewTicketPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("student", "owner");
  const sp = await searchParams;
  const orders = await listMyOrdersForSupport(user.id);
  const order = param(sp.order);
  return (
    <>
      <Link href="/app/student/help" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Help
      </Link>
      <PageHeader title="Ask for help" description="Tell us what's wrong. We usually reply within one working day." />
      <Card className="max-w-2xl p-5 sm:p-6">
        <NewTicketForm
          orders={orders}
          defaultOrderId={orders.some((o) => o.id === order) ? order : undefined}
          defaultCategory={param(sp.category)}
        />
      </Card>
    </>
  );
}
