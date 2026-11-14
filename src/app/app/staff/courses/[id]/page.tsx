import type { Metadata } from "next";
import { CourseEditorScreen } from "@/features/screens/course-editor";
import { requirePermission } from "@/lib/dal/session";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit course" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requirePermission("courses.read");
  return <CourseEditorScreen params={params} searchParams={searchParams} user={user} base="/app/staff" />;
}
