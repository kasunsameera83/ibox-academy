export type CourseStatus =
  | "draft" | "in_review" | "changes_requested" | "scheduled" | "published" | "unpublished" | "archived";
export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type AccessType = "lifetime" | "fixed_days";
export type VideoStatus = "none" | "uploading" | "processing" | "ready" | "failed";
export type CourseLanguage = "en" | "si" | "ta";
export type LessonType = "video" | "text" | "resource" | "quiz" | "assignment";
export type LessonStatus = "draft" | "published";

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
  type: LessonType;
  status: LessonStatus;
  title: string;
  description: string | null;
  /** Only filled where the viewer may read it (see getLessonBody). */
  body: string | null;
  /** Whether the lesson has text content or instructions. */
  has_body: boolean;
  settings: LessonSettings;
  reading_minutes: number | null;
  position: number;
  is_preview: boolean;
  bunny_video_id: string | null;
  video_status: VideoStatus;
  duration_seconds: number;
  /** Only loaded for the content team (0 on public pages). */
  resource_count: number;
  question_count: number;
};

export type LessonSettings = {
  /** Quiz: percentage needed to pass. */
  passPercent?: number;
  /** Assignment: how learners can submit. */
  submission?: ("text" | "file")[];
  /** Assignment: max upload size in MB. */
  maxFileMb?: number;
};

export type QuizOption = { id: string; text: string };

export type QuizQuestion = {
  id: string;
  lesson_id: string;
  position: number;
  prompt: string;
  options: QuizOption[];
  correct_option_id: string | null;
  explanation: string | null;
};

export type LessonResource = {
  id: string;
  lesson_id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string | null;
  position: number;
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
  preview_checked_at: string | null;
  intro_video_id: string | null;
  intro_video_status: VideoStatus;
  intro_duration_seconds: number;
  /** Raw certificate design; read it with parseDesign() from ./certificate. */
  certificate: unknown;
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
