export type CourseStatus =
  | "draft" | "in_review" | "changes_requested" | "scheduled" | "published" | "unpublished" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type AccessType = "lifetime" | "fixed_days";
export type VideoStatus = "none" | "uploading" | "processing" | "ready" | "failed";
export type CourseLanguage = "en" | "si" | "ta";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_path: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type Lesson = {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  description: string | null;
  position: number;
  is_preview: boolean;
  bunny_video_id: string | null;
  video_status: VideoStatus;
  duration_seconds: number;
};

export type Section = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category_id: string | null;
  level: CourseLevel;
  language: CourseLanguage;
  outcomes: string[];
  audience: string[];
  prerequisites: string[];
  thumbnail_path: string | null;
  price_lkr: number | null;
  sale_price_lkr: number | null;
  access_type: AccessType;
  access_days: number | null;
  status: CourseStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseWithCurriculum = Course & {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  sections: Section[];
};

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All levels",
};

export const LANGUAGE_LABELS: Record<CourseLanguage, string> = {
  en: "English",
  si: "Sinhala",
  ta: "Tamil",
};
