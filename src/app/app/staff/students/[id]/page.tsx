import type { Metadata } from "next";
import { StudentDetailScreen } from "@/features/screens/student-detail";
import { requirePermission } from "@/lib/dal/session";

export const metadata: Metadata = { title: "Learner" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("students.read");
  return <StudentDetailScreen params={params} user={user} base="/app/staff" />;
}
