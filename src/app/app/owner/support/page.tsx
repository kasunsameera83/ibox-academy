import type { Metadata } from "next";
import { SupportListScreen } from "@/features/screens/support-list";
import { requireRole } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Support" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("owner");
  return <SupportListScreen user={user} base="/app/owner" searchParams={searchParams} />;
}
