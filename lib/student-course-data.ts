import { createClient } from "@/lib/supabase/server";
import type { StudentModuleAccessScope } from "@/lib/module-gate";
import type { Exam, Lesson, Module } from "@/lib/types";

export type StudentCourseProgress = {
  lesson_id: number;
  watched: boolean;
  watched_at: string | null;
};

export type StudentCourseData = {
  accessLevel: number;
  moduleAccessIds: number[];
  modules: Module[];
  lessons: Lesson[];
  exams: Exam[];
  passedExamIds: number[];
  progress: StudentCourseProgress[];
};

export async function getStudentCourseData(
  studentId: string
): Promise<StudentCourseData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_student_dashboard_data", {
    p_student_id: studentId,
  });

  if (error) throw new Error(error.message);
  if (!isStudentCourseData(data)) {
    throw new Error("Student course RPC returned an invalid payload.");
  }

  return data;
}

export function getStudentAccessScope(
  data: StudentCourseData
): StudentModuleAccessScope {
  const moduleIds = new Set(data.moduleAccessIds.map(Number));
  return {
    hasExplicitAccess: moduleIds.size > 0,
    hasAllModulesAccess: data.accessLevel >= 2,
    moduleIds,
  };
}

export function getVisibleCourseModules(
  data: StudentCourseData,
  accessScope = getStudentAccessScope(data)
): Module[] {
  return accessScope.hasExplicitAccess
    ? data.modules.filter((module) => accessScope.moduleIds.has(module.id))
    : data.modules;
}

export function getCourseExamMap(
  exams: Exam[],
  moduleIds?: Set<number>
): Map<number, Exam> {
  const examMap = new Map<number, Exam>();
  for (const exam of exams) {
    const moduleId = Number(exam.module_id);
    if (!moduleIds || moduleIds.has(moduleId)) {
      examMap.set(moduleId, exam);
    }
  }
  return examMap;
}

export function getCourseProgressMap(
  progress: StudentCourseProgress[]
): Map<number, { watched: boolean; watched_at: string | null }> {
  const progressMap = new Map<
    number,
    { watched: boolean; watched_at: string | null }
  >();
  for (const item of progress) {
    progressMap.set(Number(item.lesson_id), {
      watched: item.watched === true,
      watched_at: item.watched_at,
    });
  }
  return progressMap;
}

export function buildCourseModuleAccessMap(
  modules: Module[],
  accessScope: StudentModuleAccessScope,
  exams: Exam[],
  passedExamIds: Set<number>
): Map<number, boolean> {
  const accessMap = new Map<number, boolean>();
  const orderedModules = [...modules].sort(
    (a, b) => a.order_index - b.order_index
  );
  const examIdByModuleId = new Map(
    exams.map((exam) => [Number(exam.module_id), Number(exam.id)])
  );

  for (let index = 0; index < orderedModules.length; index += 1) {
    const courseModule = orderedModules[index];
    if (
      accessScope.hasExplicitAccess &&
      !accessScope.moduleIds.has(courseModule.id)
    ) {
      accessMap.set(courseModule.id, false);
      continue;
    }

    if (index === 0) {
      accessMap.set(courseModule.id, true);
      continue;
    }

    const previousModule = orderedModules[index - 1];
    const previousExamId = examIdByModuleId.get(previousModule.id);
    accessMap.set(
      courseModule.id,
      previousExamId != null && passedExamIds.has(previousExamId)
    );
  }

  return accessMap;
}

function isStudentCourseData(value: unknown): value is StudentCourseData {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.accessLevel === "number" &&
    Array.isArray(payload.moduleAccessIds) &&
    Array.isArray(payload.modules) &&
    Array.isArray(payload.lessons) &&
    Array.isArray(payload.exams) &&
    Array.isArray(payload.passedExamIds) &&
    Array.isArray(payload.progress)
  );
}
