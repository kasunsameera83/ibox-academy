import type { Metadata } from "next";
import { ReportsScreen } from "@/features/screens/reports";
import { requirePermission } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("reports.read");
  return <ReportsScreen searchParams={searchParams} user={user} base="/app/staff" />;
}
