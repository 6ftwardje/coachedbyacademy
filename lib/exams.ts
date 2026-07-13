import { createClient } from "@/lib/supabase/server";
import type {
  Exam,
  ExamQuestion,
  ExamResult,
  SerializedExamAttempt,
} from "@/lib/types";

const EXAM_SELECT =
  "id, module_id, title, description, passing_score, is_published, created_at, updated_at";

const EXAM_QUESTION_SELECT =
  "id, exam_id, module_id, question, question_text, explanation, options, correct_answer, order_index, is_active, deleted_at, created_at, updated_at";

const EXAM_RESULT_SELECT =
  "id, student_id, exam_id, score, passed, submitted_at, created_at";

export async function getExamByModuleId(
  moduleId: number
): Promise<Exam | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select(EXAM_SELECT)
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Exam;
}

export async function getExamsByModuleIds(
  moduleIds: number[]
): Promise<Map<number, Exam>> {
  const map = new Map<number, Exam>();
  if (moduleIds.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select(EXAM_SELECT)
    .in("module_id", moduleIds)
    .eq("is_published", true);

  if (error) return map;

  for (const row of data ?? []) {
    const exam = row as Exam;
    map.set(exam.module_id, exam);
  }

  return map;
}

export async function getExamQuestions(
  examId: number
): Promise<ExamQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_questions")
    .select(EXAM_QUESTION_SELECT)
    .eq("exam_id", examId)
    .order("order_index", { ascending: true });

  if (error) return [];
  return (data ?? []).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
  })) as ExamQuestion[];
}

type StartExamRpcResponse =
  | {
      success: true;
      attempt: SerializedExamAttempt;
    }
  | {
      success: false;
      error: string;
      activeQuestionCount?: number;
      validQuestionCount?: number;
      requiredQuestionCount?: number;
    };

export async function startModuleExam(
  moduleId: number
): Promise<StartExamRpcResponse> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_module_exam", {
    p_module_id: moduleId,
  });

  if (error) {
    console.error("startModuleExam", error.message);
    return {
      success: false,
      error: "De toets kon niet worden gestart.",
    };
  }

  return normalizeStartExamResponse(data);
}

function normalizeStartExamResponse(data: unknown): StartExamRpcResponse {
  if (!data || typeof data !== "object") {
    return { success: false, error: "De toets gaf geen geldig antwoord terug." };
  }

  const payload = data as Record<string, unknown>;
  if (payload.success === true && payload.attempt) {
    return {
      success: true,
      attempt: normalizeSerializedAttempt(payload.attempt),
    };
  }

  return {
    success: false,
    error:
      typeof payload.error === "string"
        ? payload.error
        : "De toets kon niet worden gestart.",
    activeQuestionCount: asOptionalNumber(payload.activeQuestionCount),
    validQuestionCount: asOptionalNumber(payload.validQuestionCount),
    requiredQuestionCount: asOptionalNumber(payload.requiredQuestionCount),
  };
}

function normalizeSerializedAttempt(value: unknown): SerializedExamAttempt {
  const payload = value as Record<string, unknown>;
  const questions = Array.isArray(payload.questions) ? payload.questions : [];

  return {
    attemptId: String(payload.attemptId ?? ""),
    examId: Number(payload.examId ?? 0),
    moduleId: Number(payload.moduleId ?? 0),
    status: payload.status === "submitted" ? "submitted" : "in_progress",
    score: payload.score == null ? null : Number(payload.score),
    passed: payload.passed == null ? null : Boolean(payload.passed),
    totalQuestions: Number(payload.totalQuestions ?? questions.length),
    questions: questions.map((question) => {
      const q = question as Record<string, unknown>;
      const options = Array.isArray(q.options) ? q.options : [];
      return {
        id: Number(q.id ?? 0),
        questionText: String(q.questionText ?? ""),
        explanation: q.explanation == null ? null : String(q.explanation),
        options: options.map((option) => {
          const opt = option as Record<string, unknown>;
          return {
            id: Number(opt.id ?? 0),
            optionText: String(opt.optionText ?? ""),
          };
        }),
      };
    }),
  };
}

function asOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Check if the student has at least one passed result for this exam.
 */
export async function hasPassedExam(
  studentId: string,
  examId: number
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_results")
    .select("id")
    .eq("student_id", studentId)
    .eq("exam_id", examId)
    .eq("passed", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function getPassedExamIdsForStudent(
  studentId: string,
  examIds: number[]
): Promise<Set<number>> {
  const passedExamIds = new Set<number>();
  if (examIds.length === 0) return passedExamIds;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_results")
    .select("exam_id")
    .eq("student_id", studentId)
    .eq("passed", true)
    .in("exam_id", examIds);

  if (error) return passedExamIds;

  for (const row of data ?? []) {
    const result = row as { exam_id: number };
    passedExamIds.add(result.exam_id);
  }

  return passedExamIds;
}

/**
 * Get latest exam result for display (optional).
 */
export async function getLatestExamResult(
  studentId: string,
  examId: number
): Promise<ExamResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_results")
    .select(EXAM_RESULT_SELECT)
    .eq("student_id", studentId)
    .eq("exam_id", examId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ExamResult;
}

/**
 * Insert an exam result. Call from server action after scoring.
 */
export async function insertExamResult(params: {
  studentId: string;
  examId: number;
  score: number;
  passed: boolean;
}): Promise<{ error: Error | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("exam_results").insert({
    student_id: params.studentId,
    exam_id: params.examId,
    score: params.score,
    passed: params.passed,
  });

  if (error) return { error };
  return { error: null };
}
