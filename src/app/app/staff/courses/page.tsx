import type { Metadata } from "next";
import { CoursesScreen } from "@/features/screens/courses-list";
import { requirePermission } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Courses" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("courses.read");
  return <CoursesScreen searchParams={searchParams} user={user} base="/app/staff" />;
}
