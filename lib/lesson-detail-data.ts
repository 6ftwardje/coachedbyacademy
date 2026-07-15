import { createClient } from "@/lib/supabase/server";
import {
  isStudentCourseData,
  type StudentCourseData,
} from "@/lib/student-course-data";
import type { Lesson } from "@/lib/types";

export type LessonActionProgressRow = {
  action_index: number;
  completed: boolean;
};

export type StudentLessonDetailData = {
  studentId: string;
  course: StudentCourseData;
  lesson: Lesson;
  actionProgress: LessonActionProgressRow[];
};

export async function getStudentLessonDetailData(
  slug: string
): Promise<StudentLessonDetailData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_student_lesson_detail_data",
    { p_slug: slug }
  );

  if (error) throw new Error(error.message);
  if (data === null) return null;
  if (!isStudentLessonDetailData(data)) {
    throw new Error("Lesson detail RPC returned an invalid payload.");
  }

  return data;
}

function isStudentLessonDetailData(
  value: unknown
): value is StudentLessonDetailData {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  const lesson = payload.lesson as Record<string, unknown> | null;

  return (
    typeof payload.studentId === "string" &&
    isStudentCourseData(payload.course) &&
    !!lesson &&
    typeof lesson.id === "number" &&
    typeof lesson.module_id === "number" &&
    typeof lesson.slug === "string" &&
    Array.isArray(payload.actionProgress) &&
    payload.actionProgress.every((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return (
        typeof row.action_index === "number" &&
        typeof row.completed === "boolean"
      );
    })
  );
}
