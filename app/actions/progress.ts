"use server";

import { ensureCurrentStudent } from "@/lib/students";
import { upsertLessonProgress } from "@/lib/progress";
import { getLessonById } from "@/lib/lessons";
import { canStudentAccessModule } from "@/lib/module-gate";

export async function markLessonComplete(lessonId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  const { student, error: studentError } = await ensureCurrentStudent();
  if (studentError || !student) {
    return { success: false, error: "Je bent niet aangemeld." };
  }

  const lesson = await getLessonById(lessonId);
  if (!lesson) {
    return { success: false, error: "Deze les bestaat niet meer." };
  }

  const canAccessModule = await canStudentAccessModule(student.id, lesson.module_id);
  if (!canAccessModule) {
    return { success: false, error: "Je hebt geen toegang tot deze les." };
  }

  const { error } = await upsertLessonProgress(student.id, lessonId);
  if (error) {
    return { success: false, error: "Je voortgang kon niet worden opgeslagen." };
  }
  return { success: true };
}
