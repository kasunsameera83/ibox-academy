import type { Metadata } from "next";
import { SecurityScreen } from "@/features/screens/security";
import { requirePermission } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Security" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("audit.read");
  return <SecurityScreen user={user} base="/app/staff" searchParams={searchParams} />;
}
