"use server";

import { revalidatePath } from "next/cache";
import { getLessonById } from "@/lib/lessons";
import {
  normalizeLessonActions,
  upsertLessonActionProgress,
} from "@/lib/lesson-actions";
import { ensureCurrentStudent } from "@/lib/students";
import { canStudentAccessModule } from "@/lib/module-gate";

export async function toggleLessonAction(
  lessonId: number,
  actionIndex: number,
  completed: boolean
): Promise<{ success: boolean; error?: string }> {
  const { student, error: studentError } = await ensureCurrentStudent();
  if (studentError || !student) {
    return { success: false, error: "Je bent niet aangemeld." };
  }

  const lesson = await getLessonById(lessonId);
  const actions = normalizeLessonActions(lesson?.action_items);
  if (!lesson || !Number.isInteger(actionIndex) || actionIndex < 0 || actionIndex >= actions.length) {
    return { success: false, error: "Deze opdracht bestaat niet meer." };
  }

  const canAccessModule = await canStudentAccessModule(student.id, lesson.module_id);
  if (!canAccessModule) {
    return { success: false, error: "Je hebt geen toegang tot deze opdracht." };
  }

  const { error } = await upsertLessonActionProgress({
    studentId: student.id,
    lessonId,
    actionIndex,
    completed,
  });

  if (error) {
    return { success: false, error: "Je opdracht kon niet worden bijgewerkt." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/lessons/${lesson.slug}`);
  return { success: true };
}
