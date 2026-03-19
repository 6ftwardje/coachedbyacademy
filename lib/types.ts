export type Student = {
  id: string;
  email: string;
  name: string | null;
  auth_user_id: string;
  access_level: number;
  created_at: string;
  updated_at: string;
  last_seen: string | null;
  phone: string | null;
};

export type Module = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  order_index: number;
  thumbnail_url: string | null;
  icon_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Lesson = {
  id: number;
  module_id: number;
  title: string;
  slug: string;
  description: string | null;
  video_url: string | null;
  video_provider: string;
  video_duration_seconds: number | null;
  thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  totalModules: number;
  publishedModules: number;
  totalLessons: number;
};

export type Progress = {
  id: string;
  student_id: string;
  lesson_id: number;
  watched: boolean;
  watched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Exam = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  passing_score: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type ExamQuestion = {
  id: number;
  exam_id: number;
  question: string;
  options: string[];
  correct_answer: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type ExamResult = {
  id: string;
  student_id: string;
  exam_id: number;
  score: number;
  passed: boolean;
  submitted_at: string;
  created_at: string;
};

/** Lesson status for UI: locked, available, or completed */
export type LessonStatus = "locked" | "available" | "completed";

export type LessonWithStatus = Lesson & { status: LessonStatus };
