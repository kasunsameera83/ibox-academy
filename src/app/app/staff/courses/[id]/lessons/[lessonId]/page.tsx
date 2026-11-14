import type { Metadata } from "next";
import { LessonEditorScreen } from "@/features/screens/lesson-editor";
import { requirePermission } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function Page({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const user = await requirePermission("courses.read");
  return <LessonEditorScreen params={params} user={user} base="/app/staff" />;
}
