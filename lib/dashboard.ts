import { createClient } from "@/lib/supabase/server";
import { getExamsByModuleIds, getPassedExamIdsForStudent } from "@/lib/exams";
import {
  getLessonActionProgress,
  normalizeLessonActions,
} from "@/lib/lesson-actions";
import { getPublishedLessonsByModuleIds } from "@/lib/lessons";
import {
  getModuleAccessMap,
  getStudentModuleAccessScope,
  type StudentModuleAccessScope,
} from "@/lib/module-gate";
import { getPublishedModules } from "@/lib/modules";
import { timeAsync } from "@/lib/perf";
import { getProgressByLessonIds } from "@/lib/progress";
import type { DashboardStats, Exam, Lesson, Module } from "@/lib/types";

export type DashboardModuleState = "locked" | "available" | "completed";

export type DashboardModuleSummary = {
  module: Module;
  state: DashboardModuleState;
  completedLessons: number;
  totalLessons: number;
};

export type DashboardNextStep =
  | {
      type: "lesson";
      href: string;
      label: string;
      lesson: Lesson;
      module: Module;
      completedLessons: number;
      totalLessons: number;
      actions: string[];
      actionProgress: Map<number, boolean>;
    }
  | {
      type: "exam";
      href: string;
      label: string;
      module: Module;
      exam: Exam;
      completedLessons: number;
      totalLessons: number;
    }
  | {
      type: "module";
      href: string;
      label: string;
      module: Module;
      completedLessons: number;
      totalLessons: number;
    }
  | {
      type: "completed";
      href: string;
      label: string;
      module: Module | null;
      completedLessons: number;
      totalLessons: number;
    };

export type DashboardOverview = {
  nextStep: DashboardNextStep;
  modules: DashboardModuleSummary[];
};

type DashboardProgress = {
  lesson_id: number;
  watched: boolean;
  watched_at: string | null;
};

type DashboardRpcPayload = {
  accessLevel: number;
  moduleAccessIds: number[];
  modules: Module[];
  lessons: Lesson[];
  exams: Exam[];
  passedExamIds: number[];
  progress: DashboardProgress[];
};

type DashboardOverviewInput = {
  studentId: string;
  allModules: Module[];
  accessScope: StudentModuleAccessScope;
  lessons: Lesson[];
  examMap: Map<number, Exam>;
  passedExamIds: Set<number>;
  progressMap: Map<number, { watched: boolean; watched_at: string | null }>;
  accessMap: Map<number, boolean>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [modulesRes, lessonsRes] = await Promise.all([
    supabase.from("modules").select("id, is_published", { count: "exact" }),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  const totalModules = modulesRes.count ?? 0;
  const publishedModules =
    modulesRes.data?.filter((m) => m.is_published).length ?? 0;
  const totalLessons = lessonsRes.count ?? 0;

  return {
    totalModules,
    publishedModules,
    totalLessons,
  };
}

export async function getDashboardOverview(
  studentId: string
): Promise<DashboardOverview> {
  return timeAsync("[perf] dashboard.query", async () => {
    if (process.env.PROJECT_SPEED_DASHBOARD_RPC === "on") {
      try {
        return await getDashboardOverviewFromRpc(studentId);
      } catch (error) {
        console.error("getDashboardOverview.rpc", error);
      }
    }

    return getDashboardOverviewLegacy(studentId);
  });
}

async function getDashboardOverviewLegacy(
  studentId: string
): Promise<DashboardOverview> {
  const [allModules, accessScope] = await Promise.all([
    getPublishedModules(),
    getStudentModuleAccessScope(studentId),
  ]);
  const modules = accessScope.hasExplicitAccess
    ? allModules.filter((module) => accessScope.moduleIds.has(module.id))
    : allModules;
  const orderedModules = [...modules].sort(
    (a, b) => a.order_index - b.order_index
  );
  const moduleIds = orderedModules.map((module) => module.id);
  const [accessMap, examMap, lessons] = await Promise.all([
    getModuleAccessMap(studentId, allModules, accessScope),
    getExamsByModuleIds(moduleIds),
    getPublishedLessonsByModuleIds(moduleIds),
  ]);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const [passedExamIds, progressMap] = await Promise.all([
    getPassedExamIdsForStudent(
      studentId,
      [...examMap.values()].map((exam) => exam.id)
    ),
    getProgressByLessonIds(studentId, lessonIds),
  ]);

  return buildDashboardOverview({
    studentId,
    allModules,
    accessScope,
    lessons,
    examMap,
    passedExamIds,
    progressMap,
    accessMap,
  });
}

async function getDashboardOverviewFromRpc(
  studentId: string
): Promise<DashboardOverview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_student_dashboard_data", {
    p_student_id: studentId,
  });

  if (error) throw new Error(error.message);
  if (!isDashboardRpcPayload(data)) {
    throw new Error("Dashboard RPC returned an invalid payload.");
  }

  const accessScope: StudentModuleAccessScope = {
    hasExplicitAccess: data.moduleAccessIds.length > 0,
    hasAllModulesAccess: data.accessLevel >= 2,
    moduleIds: new Set(data.moduleAccessIds.map(Number)),
  };
  const visibleModuleIds = new Set(
    (accessScope.hasExplicitAccess
      ? data.modules.filter((module) => accessScope.moduleIds.has(module.id))
      : data.modules
    ).map((module) => module.id)
  );
  const examMap = new Map<number, Exam>();
  for (const exam of data.exams) {
    if (visibleModuleIds.has(Number(exam.module_id))) {
      examMap.set(Number(exam.module_id), exam);
    }
  }
  const progressMap = new Map<
    number,
    { watched: boolean; watched_at: string | null }
  >();
  for (const progress of data.progress) {
    progressMap.set(Number(progress.lesson_id), {
      watched: progress.watched === true,
      watched_at: progress.watched_at,
    });
  }

  return buildDashboardOverview({
    studentId,
    allModules: data.modules,
    accessScope,
    lessons: data.lessons,
    examMap,
    passedExamIds: new Set(data.passedExamIds.map(Number)),
    progressMap,
    accessMap: buildModuleAccessMap(
      data.modules,
      accessScope,
      data.exams,
      new Set(data.passedExamIds.map(Number))
    ),
  });
}

async function buildDashboardOverview({
  studentId,
  allModules,
  accessScope,
  lessons,
  examMap,
  passedExamIds,
  progressMap,
  accessMap,
}: DashboardOverviewInput): Promise<DashboardOverview> {
  const modules = accessScope.hasExplicitAccess
    ? allModules.filter((module) => accessScope.moduleIds.has(module.id))
    : allModules;
  const orderedModules = [...modules].sort(
    (a, b) => a.order_index - b.order_index
  );

  const lessonsByModule = new Map<number, Lesson[]>();
  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.module_id, list);
  }

  const summaries = orderedModules.map((module) => {
    const moduleLessons = lessonsByModule.get(module.id) ?? [];
    const completedLessons = moduleLessons.filter(
      (lesson) => progressMap.get(lesson.id)?.watched === true
    ).length;
    const exam = examMap.get(module.id);
    const state: DashboardModuleState =
      accessMap.get(module.id) !== true
        ? "locked"
        : exam && passedExamIds.has(exam.id)
        ? "completed"
        : "available";

    return {
      module,
      state,
      completedLessons,
      totalLessons: moduleLessons.length,
    };
  });

  const currentSummary =
    summaries.find((summary) => summary.state === "available") ?? null;

  if (!currentSummary) {
    const completedLessons = summaries.reduce(
      (total, summary) => total + summary.completedLessons,
      0
    );
    const totalLessons = summaries.reduce(
      (total, summary) => total + summary.totalLessons,
      0
    );
    return {
      modules: summaries,
      nextStep: {
        type: "completed",
        href: "/modules",
        label: "Bekijk je traject",
        module: summaries.at(-1)?.module ?? null,
        completedLessons,
        totalLessons,
      },
    };
  }

  const currentModule = currentSummary.module;
  const currentLessons = lessonsByModule.get(currentModule.id) ?? [];
  const nextLesson =
    currentLessons.find(
      (lesson) => progressMap.get(lesson.id)?.watched !== true
    ) ?? null;

  if (nextLesson) {
    const actions = normalizeLessonActions(nextLesson.action_items);
    return {
      modules: summaries,
      nextStep: {
        type: "lesson",
        href: `/lessons/${nextLesson.slug}`,
        label:
          currentSummary.completedLessons === 0
            ? "Start met deze les"
            : "Ga verder met de les",
        lesson: nextLesson,
        module: currentModule,
        completedLessons: currentSummary.completedLessons,
        totalLessons: currentSummary.totalLessons,
        actions,
        actionProgress:
          actions.length > 0
            ? await getLessonActionProgress(studentId, nextLesson.id)
            : new Map<number, boolean>(),
      },
    };
  }

  const exam = examMap.get(currentModule.id);
  if (exam) {
    return {
      modules: summaries,
      nextStep: {
        type: "exam",
        href: `/modules/${currentModule.slug}/exam`,
        label: "Maak de moduletoets",
        module: currentModule,
        exam,
        completedLessons: currentSummary.completedLessons,
        totalLessons: currentSummary.totalLessons,
      },
    };
  }

  return {
    modules: summaries,
    nextStep: {
      type: "module",
      href: `/modules/${currentModule.slug}`,
      label: "Bekijk de module",
      module: currentModule,
      completedLessons: currentSummary.completedLessons,
      totalLessons: currentSummary.totalLessons,
    },
  };
}

function buildModuleAccessMap(
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

function isDashboardRpcPayload(value: unknown): value is DashboardRpcPayload {
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
