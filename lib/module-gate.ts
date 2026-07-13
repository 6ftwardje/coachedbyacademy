import type { Module } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getPublishedModules } from "@/lib/modules";
import { isMissingSupabaseTableError } from "@/lib/supabase/errors";
import { ALL_MODULES_ACCESS_LEVEL } from "@/lib/admin/constants";

const STUDENT_MODULE_ACCESS_TABLE = "student_module_access";

export type StudentModuleAccessScope = {
  hasExplicitAccess: boolean;
  hasAllModulesAccess: boolean;
  moduleIds: Set<number>;
};

export async function getStudentModuleAccessScope(
  studentId: string
): Promise<StudentModuleAccessScope> {
  const supabase = await createClient();
  const [
    { data: moduleAccessData, error: moduleAccessError },
    { data: studentData, error: studentError },
  ] = await Promise.all([
    supabase
      .from("student_module_access")
      .select("module_id")
      .eq("student_id", studentId),
    supabase
      .from("students")
      .select("access_level")
      .eq("id", studentId)
      .maybeSingle(),
  ]);

  if (moduleAccessError) {
    if (
      !isMissingSupabaseTableError(
        moduleAccessError,
        STUDENT_MODULE_ACCESS_TABLE
      )
    ) {
      console.error(
        "getStudentModuleAccessScope.moduleAccess",
        moduleAccessError.message
      );
    }
  }

  if (studentError) {
    console.error(
      "getStudentModuleAccessScope.student",
      studentError.message
    );
  }

  const moduleIds = new Set(
    (moduleAccessData ?? []).map((row) => Number(row.module_id))
  );
  return {
    hasExplicitAccess: moduleIds.size > 0,
    hasAllModulesAccess:
      Number(studentData?.access_level ?? 1) >= ALL_MODULES_ACCESS_LEVEL,
    moduleIds,
  };
}

export async function getVisibleModulesForStudent(
  studentId: string,
  modules: Module[]
): Promise<Module[]> {
  const scope = await getStudentModuleAccessScope(studentId);
  if (!scope.hasExplicitAccess) return modules;
  return modules.filter((module) => scope.moduleIds.has(module.id));
}

/**
 * For each module (by order_index), check if the student has passed the *previous* module's exam.
 * Module 1 is always accessible. Module N+1 requires passed exam for module N.
 * Access configuration limits what a student can see, but does not bypass the sequence gate.
 * Returns a map: moduleId -> boolean (true = can access).
 */
export async function getModuleAccessMap(
  studentId: string,
  modules: Module[],
  scope?: StudentModuleAccessScope
): Promise<Map<number, boolean>> {
  const map = new Map<number, boolean>();
  if (modules.length === 0) return map;

  const ordered = [...modules].sort((a, b) => a.order_index - b.order_index);
  const accessScope = scope ?? (await getStudentModuleAccessScope(studentId));

  const supabase = await createClient();
  const { data: results } = await supabase
    .from("exam_results")
    .select("exam_id, passed")
    .eq("student_id", studentId)
    .eq("passed", true);

  const passedExamIds = new Set(
    (results ?? []).map((r: { exam_id: number }) => r.exam_id)
  );

  // We need "passed exam for module with order_index K" to unlock "module with order_index K+1"
  const examIdByModuleId = new Map<number, number>();
  const { data: exams } = await supabase
    .from("exams")
    .select("id, module_id")
    .in(
      "module_id",
      ordered.map((m) => m.id)
    );
  for (const e of exams ?? []) {
    const row = e as { id: number; module_id: number };
    examIdByModuleId.set(row.module_id, row.id);
  }

  for (let i = 0; i < ordered.length; i++) {
    const mod = ordered[i];
    const isVisibleByAccessScope =
      !accessScope.hasExplicitAccess || accessScope.moduleIds.has(mod.id);

    if (!isVisibleByAccessScope) {
      map.set(mod.id, false);
      continue;
    }

    if (i === 0) {
      map.set(mod.id, true);
    } else {
      const prevModule = ordered[i - 1];
      const prevExamId = examIdByModuleId.get(prevModule.id);
      const prevPassed = prevExamId ? passedExamIds.has(prevExamId) : false;
      map.set(mod.id, prevPassed);
    }
  }
  return map;
}

export function canAccessModule(
  moduleId: number,
  accessMap: Map<number, boolean>
): boolean {
  return accessMap.get(moduleId) === true;
}

export async function canStudentAccessModule(
  studentId: string,
  moduleId: number
): Promise<boolean> {
  const modules = await getPublishedModules();
  const accessMap = await getModuleAccessMap(studentId, modules);
  return canAccessModule(moduleId, accessMap);
}
