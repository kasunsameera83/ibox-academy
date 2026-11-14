import type { Metadata } from "next";
import { AssignmentsScreen } from "@/features/screens/assignments-list";
import { requirePermission } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Assignments" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("courses.edit");
  return <AssignmentsScreen searchParams={searchParams} user={user} base="/app/staff" />;
}
