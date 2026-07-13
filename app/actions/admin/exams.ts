"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/access";
import {
  archiveExamQuestionAdmin,
  saveExamQuestionAdmin,
  setExamQuestionActiveAdmin,
  type SaveExamQuestionInput,
} from "@/lib/admin/exam-questions";
import { logAdminAction } from "@/lib/admin/audit";

type ActionResult<T extends object = object> = T & {
  success: boolean;
  error?: string;
};

export async function adminSaveExamQuestion(
  input: SaveExamQuestionInput
): Promise<ActionResult<{ questionId?: number }>> {
  const { actorStudent } = await requireAdmin();
  const result = await saveExamQuestionAdmin(input, actorStudent.id);
  if (result.error) return { success: false, error: result.error };

  logAdminAction("exam.question_saved", {
    actorStudentId: actorStudent.id,
    metadata: {
      question_id: result.questionId,
      module_id: input.moduleId,
      copied_from_question_id: input.questionId ?? null,
    },
  });

  revalidatePath("/admin/exams");
  revalidatePath("/modules");
  return { success: true, questionId: result.questionId };
}

export async function adminSetExamQuestionActive(
  questionId: number,
  isActive: boolean
): Promise<ActionResult> {
  const { actorStudent } = await requireAdmin();
  const result = await setExamQuestionActiveAdmin(
    questionId,
    isActive,
    actorStudent.id
  );
  if (result.error) return { success: false, error: result.error };

  logAdminAction("exam.question_active_changed", {
    actorStudentId: actorStudent.id,
    metadata: { question_id: questionId, is_active: isActive },
  });

  revalidatePath("/admin/exams");
  return { success: true };
}

export async function adminArchiveExamQuestion(
  questionId: number
): Promise<ActionResult> {
  const { actorStudent } = await requireAdmin();
  const result = await archiveExamQuestionAdmin(questionId, actorStudent.id);
  if (result.error) return { success: false, error: result.error };

  logAdminAction("exam.question_archived", {
    actorStudentId: actorStudent.id,
    metadata: { question_id: questionId },
  });

  revalidatePath("/admin/exams");
  return { success: true };
}
