"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Submit exam answers. Scoring happens only inside the Supabase RPC.
 */
export async function submitModuleExam(
  attemptId: string,
  answers: { questionId: number; selectedOptionId: number }[]
): Promise<{
  success: boolean;
  score?: number;
  passed?: boolean;
  correctCount?: number;
  totalQuestions?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_module_exam", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });

  if (error) {
    console.error("submitModuleExam", error.message);
    return { success: false, error: "Je resultaat kon niet worden opgeslagen." };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "De toets gaf geen geldig antwoord terug." };
  }

  const payload = data as Record<string, unknown>;
  return {
    success: payload.success === true,
    score: payload.score == null ? undefined : Number(payload.score),
    passed: payload.passed == null ? undefined : Boolean(payload.passed),
    correctCount:
      payload.correctCount == null ? undefined : Number(payload.correctCount),
    totalQuestions:
      payload.totalQuestions == null ? undefined : Number(payload.totalQuestions),
    error: typeof payload.error === "string" ? payload.error : undefined,
  };
}
