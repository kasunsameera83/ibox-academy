import type { Metadata } from "next";
import { StudentsScreen } from "@/features/screens/students-list";
import { requirePermission } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("students.read");
  return <StudentsScreen searchParams={searchParams} user={user} base="/app/staff" />;
}
