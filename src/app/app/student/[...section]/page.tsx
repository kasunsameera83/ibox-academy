import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/layouts/coming-soon";
import { studentNav } from "@/config/navigation";
import { requireRole } from "@/lib/dal/session";
import { findNavItem } from "@/lib/navigation";

export default async function StudentSectionPage({ params }: { params: Promise<{ section: string[] }> }) {
  await requireRole("student", "owner");
  const { section } = await params;
  const item = findNavItem(studentNav, `/app/student/${section.join("/")}`);
  if (!item) notFound();
  return <ComingSoon title={item.label} description={item.description} phase={item.phase} backHref="/app/student" />;
}
