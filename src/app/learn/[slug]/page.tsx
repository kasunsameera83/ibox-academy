import { notFound, redirect } from "next/navigation";
import { getLearnerCourse, resumeLessonId } from "@/lib/dal/learning";
import { getCurrentUser } from "@/lib/dal/session";

/** /learn/<course> takes the learner straight to where they left off. */
export default async function ResumeCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/learn/${slug}`)}`);
  if (user.role === "owner" && user.aal !== "aal2") redirect("/mfa");

  const data = await getLearnerCourse(slug, user);
  if (!data) redirect(`/courses/${encodeURIComponent(slug)}`);
  const lessonId = resumeLessonId(data);
  if (!lessonId) notFound();
  redirect(`/learn/${slug}/${lessonId}`);
}
