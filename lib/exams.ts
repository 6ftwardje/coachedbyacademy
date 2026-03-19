import { createClient } from "@/lib/supabase/server";
import type { Exam, ExamQuestion, ExamResult } from "@/lib/types";

export async function getExamByModuleId(
  moduleId: number
): Promise<Exam | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Exam;
}

export async function getExamQuestions(
  examId: number
): Promise<ExamQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", examId)
    .order("order_index", { ascending: true });

  if (error) return [];
  return (data ?? []).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
  })) as ExamQuestion[];
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
    .select("*")
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
