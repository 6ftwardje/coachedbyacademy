import { getExamsByModuleIds, getPassedExamIdsForStudent } from "@/lib/exams";
import { getLessonCountsByModuleIds } from "@/lib/lessons";
import {
  getModuleAccessMap,
  getStudentModuleAccessScope,
  type StudentModuleAccessScope,
} from "@/lib/module-gate";
import { getPublishedModules } from "@/lib/modules";
import { timeAsync } from "@/lib/perf";
import {
  buildCourseModuleAccessMap,
  getCourseExamMap,
  getStudentAccessScope,
  getStudentCourseData,
  getVisibleCourseModules,
} from "@/lib/student-course-data";
import type { Exam, Module } from "@/lib/types";

export type ModuleOverviewState = "locked" | "available" | "completed";

export type ModulesOverview = {
  orderedModules: Module[];
  lessonCountMap: Map<number, number>;
  moduleStateMap: Map<number, ModuleOverviewState>;
  hasLockedModules: boolean;
};

type ModulesOverviewInput = {
  allModules: Module[];
  accessScope: StudentModuleAccessScope;
  lessonCountMap: Map<number, number>;
  examMap: Map<number, Exam>;
  passedExamIds: Set<number>;
  moduleAccessMap: Map<number, boolean>;
};

export async function getModulesOverview(
  studentId: string
): Promise<ModulesOverview> {
  return timeAsync("[perf] modules.query", async () => {
    if (process.env.PROJECT_SPEED_MODULES_RPC === "on") {
      try {
        return await getModulesOverviewFromRpc(studentId);
      } catch (error) {
        console.error("getModulesOverview.rpc", error);
      }
    }

    return getModulesOverviewLegacy(studentId);
  });
}

async function getModulesOverviewFromRpc(
  studentId: string
): Promise<ModulesOverview> {
  const data = await getStudentCourseData(studentId);
  const accessScope = getStudentAccessScope(data);
  const modules = getVisibleCourseModules(data, accessScope);
  const visibleModuleIds = new Set(modules.map((module) => module.id));
  const lessonCountMap = new Map(modules.map((module) => [module.id, 0]));
  for (const lesson of data.lessons) {
    if (visibleModuleIds.has(Number(lesson.module_id))) {
      lessonCountMap.set(
        Number(lesson.module_id),
        (lessonCountMap.get(Number(lesson.module_id)) ?? 0) + 1
      );
    }
  }
  const passedExamIds = new Set(data.passedExamIds.map(Number));

  return buildModulesOverview({
    allModules: data.modules,
    accessScope,
    lessonCountMap,
    examMap: getCourseExamMap(data.exams, visibleModuleIds),
    passedExamIds,
    moduleAccessMap: buildCourseModuleAccessMap(
      data.modules,
      accessScope,
      data.exams,
      passedExamIds
    ),
  });
}

async function getModulesOverviewLegacy(
  studentId: string
): Promise<ModulesOverview> {
  const [allModules, accessScope] = await Promise.all([
    getPublishedModules(),
    getStudentModuleAccessScope(studentId),
  ]);
  const modules = accessScope.hasExplicitAccess
    ? allModules.filter((module) => accessScope.moduleIds.has(module.id))
    : allModules;
  const moduleIds = modules.map((module) => module.id);
  const [lessonCountMap, moduleAccessMap, examMap] = await Promise.all([
    getLessonCountsByModuleIds(moduleIds),
    getModuleAccessMap(studentId, allModules, accessScope),
    getExamsByModuleIds(moduleIds),
  ]);
  const passedExamIds = await getPassedExamIdsForStudent(
    studentId,
    [...examMap.values()].map((exam) => exam.id)
  );

  return buildModulesOverview({
    allModules,
    accessScope,
    lessonCountMap,
    examMap,
    passedExamIds,
    moduleAccessMap,
  });
}

function buildModulesOverview({
  allModules,
  accessScope,
  lessonCountMap,
  examMap,
  passedExamIds,
  moduleAccessMap,
}: ModulesOverviewInput): ModulesOverview {
  const modules = accessScope.hasExplicitAccess
    ? allModules.filter((module) => accessScope.moduleIds.has(module.id))
    : allModules;
  const orderedModules = [...modules].sort(
    (a, b) => a.order_index - b.order_index
  );
  const moduleStateMap = new Map<number, ModuleOverviewState>();

  for (const courseModule of orderedModules) {
    if (moduleAccessMap.get(courseModule.id) !== true) {
      moduleStateMap.set(courseModule.id, "locked");
      continue;
    }

    const exam = examMap.get(courseModule.id);
    moduleStateMap.set(
      courseModule.id,
      exam && passedExamIds.has(exam.id) ? "completed" : "available"
    );
  }

  return {
    orderedModules,
    lessonCountMap,
    moduleStateMap,
    hasLockedModules: orderedModules.some(
      (courseModule) => moduleStateMap.get(courseModule.id) === "locked"
    ),
  };
}
