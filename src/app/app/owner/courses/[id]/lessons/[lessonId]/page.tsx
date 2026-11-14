import type { Metadata } from "next";
import { LessonEditorScreen } from "@/features/screens/lesson-editor";
import { requireRole } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function Page({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const user = await requireRole("owner");
  return <LessonEditorScreen params={params} user={user} base="/app/owner" />;
}
