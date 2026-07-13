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
  takeaway: string | null;
  action_items: string[];
  video_url: string | null;
  video_provider: string;
  video_duration_seconds: number | null;
  thumbnail_url: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_playback_policy: "public" | "signed";
  mux_status: "preparing" | "ready" | "errored" | null;
  mux_upload_id: string | null;
  mux_error_message: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type LessonTranscriptProvider = "mux" | "vimeo" | "manual" | "import";
export type LessonTranscriptSourceFormat = "vtt" | "srt" | "txt" | "json" | "unknown";
export type LessonTranscriptStatus =
  | "queued"
  | "processing"
  | "ready"
  | "ready_empty"
  | "failed"
  | "superseded";

export type LessonTranscript = {
  id: string;
  lesson_id: number;
  provider: LessonTranscriptProvider;
  provider_asset_id: string | null;
  provider_track_id: string | null;
  source_format: LessonTranscriptSourceFormat;
  language_code: string;
  language_confidence: number | null;
  status: LessonTranscriptStatus;
  is_current: boolean;
  raw_text: string | null;
  normalized_text: string | null;
  raw_payload: Record<string, unknown>;
  content_hash: string | null;
  error_message: string | null;
  generated_at: string | null;
  imported_at: string | null;
  superseded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonTranscriptSegment = {
  id: string;
  transcript_id: string;
  lesson_id: number;
  segment_index: number;
  start_ms: number | null;
  end_ms: number | null;
  speaker: string | null;
  text: string;
  created_at: string;
};

export type ContentChunkSourceType =
  | "transcript"
  | "lesson_metadata"
  | "exam_question"
  | "manual";
export type ContentChunkEmbeddingStatus =
  | "not_required"
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "stale";

export type ContentChunk = {
  id: string;
  lesson_id: number | null;
  transcript_id: string | null;
  source_type: ContentChunkSourceType;
  chunk_index: number;
  text: string;
  token_count: number | null;
  content_hash: string;
  metadata: Record<string, unknown>;
  embedding_status: ContentChunkEmbeddingStatus;
  embedding_error_message: string | null;
  embedded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TranscriptionJobType =
  | "mux_import"
  | "mux_generate"
  | "vimeo_import"
  | "manual_import"
  | "chunk"
  | "embed";
export type TranscriptionJobStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "dead"
  | "cancelled";

export type TranscriptionJob = {
  id: string;
  lesson_id: number | null;
  transcript_id: string | null;
  job_type: TranscriptionJobType;
  status: TranscriptionJobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  run_after: string;
  locked_at: string | null;
  locked_by: string | null;
  payload: Record<string, unknown>;
  idempotency_key: string;
  last_error: string | null;
  finished_at: string | null;
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

export type LessonActionProgress = {
  id: string;
  student_id: string;
  lesson_id: number;
  action_index: number;
  completed: boolean;
  completed_at: string | null;
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
  module_id?: number;
  question: string;
  question_text?: string;
  explanation?: string | null;
  options: string[];
  correct_answer: string;
  order_index: number;
  is_active?: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamAttemptOption = {
  id: number;
  optionText: string;
};

export type ExamAttemptQuestion = {
  id: number;
  questionText: string;
  explanation: string | null;
  options: ExamAttemptOption[];
};

export type SerializedExamAttempt = {
  attemptId: string;
  examId: number;
  moduleId: number;
  status: "in_progress" | "submitted";
  score: number | null;
  passed: boolean | null;
  totalQuestions: number;
  questions: ExamAttemptQuestion[];
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
