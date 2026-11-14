import { ClipboardPen, FileText, ListChecks, Paperclip, PlayCircle } from "lucide-react";
import type { LessonType } from "@/lib/courses/types";
import { cn } from "@/lib/utils";

const STYLES: Record<LessonType, { icon: typeof PlayCircle; className: string }> = {
  video: { icon: PlayCircle, className: "bg-brand-soft text-brand" },
  text: { icon: FileText, className: "bg-info-soft text-info-ink" },
  resource: { icon: Paperclip, className: "bg-success-soft text-success-ink" },
  quiz: { icon: ListChecks, className: "bg-warning-soft text-warning-ink" },
  assignment: { icon: ClipboardPen, className: "bg-lilac text-ink" },
};

export function LessonTypeIcon({ type, size = "md" }: { type: LessonType; size?: "sm" | "md" }) {
  const { icon: Icon, className } = STYLES[type];
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-control", size === "md" ? "size-10" : "size-8", className)}
      aria-hidden="true"
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} />
    </span>
  );
}
