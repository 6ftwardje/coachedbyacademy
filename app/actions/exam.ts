"use server";

import { ensureCurrentStudent } from "@/lib/students";
import { getExamQuestions, insertExamResult } from "@/lib/exams";
import { createClient } from "@/lib/supabase/server";
import { canStudentAccessModule } from "@/lib/module-gate";

/**
 * Submit exam answers, compute score, and insert exam_results.
 * answers: array of { questionId: number, selectedAnswer: string } in order.
 */
export async function submitExam(
  examId: number,
  answers: { questionId: number; selectedAnswer: string }[]
): Promise<{
  success: boolean;
  score?: number;
  passed?: boolean;
  error?: string;
}> {
  const { student, error: studentError } = await ensureCurrentStudent();
  if (studentError || !student) {
    return { success: false, error: "Je bent niet aangemeld." };
  }

  const questions = await getExamQuestions(examId);
  if (questions.length === 0) {
    return { success: false, error: "Deze toets bevat nog geen vragen." };
  }

  const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedAnswer]));
  let correct = 0;
  for (const q of questions) {
    const selected = answerMap.get(q.id);
    if (selected != null && selected === q.correct_answer) {
      correct++;
    }
  }

  const score = Math.round((correct / questions.length) * 100);

  const supabase = await createClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("module_id, passing_score")
    .eq("id", examId)
    .single();
  const examRow = exam as { module_id: number; passing_score: number } | null;
  if (!examRow) {
    return { success: false, error: "Deze toets bestaat niet meer." };
  }

  const canAccessModule = await canStudentAccessModule(student.id, examRow.module_id);
  if (!canAccessModule) {
    return { success: false, error: "Je hebt geen toegang tot deze toets." };
  }

  const passingScore = examRow.passing_score ?? 70;
  const passed = score >= passingScore;

  const { error: insertError } = await insertExamResult({
    studentId: student.id,
    examId,
    score,
    passed,
  });

  if (insertError) {
    return { success: false, error: "Je resultaat kon niet worden opgeslagen." };
  }

  return { success: true, score, passed };
}
