import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureCurrentStudent } from "@/lib/students";
import { getModuleBySlug } from "@/lib/modules";
import { getPublishedLessonsByModuleId } from "@/lib/lessons";
import { getLessonStatuses, lessonsWithStatus } from "@/lib/lesson-gate";
import { getModuleAccessMap } from "@/lib/module-gate";
import { getExamByModuleId } from "@/lib/exams";
import { hasPassedExam } from "@/lib/exams";
import { getPublishedModules } from "@/lib/modules";
import type { LessonStatus } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

function statusBadge(status: LessonStatus) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Completed
        </span>
      );
    case "available":
      return (
        <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
          Available
        </span>
      );
    case "locked":
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          Locked
        </span>
      );
  }
}

export default async function ModuleDetailPage({ params }: Props) {
  const { slug } = await params;
  const moduleData = await getModuleBySlug(slug);
  if (!moduleData) notFound();

  const { student } = await ensureCurrentStudent();
  if (!student) notFound();

  const [lessons, allModules, exam] = await Promise.all([
    getPublishedLessonsByModuleId(moduleData.id),
    getPublishedModules(),
    getExamByModuleId(moduleData.id),
  ]);

  const statusMap = await getLessonStatuses(student.id, lessons);
  const lessonsWithStatusList = lessonsWithStatus(lessons, statusMap);
  const moduleAccessMap = await getModuleAccessMap(student.id, allModules);
  const canAccessModule = moduleAccessMap.get(moduleData.id) === true;
  const hasPassedThisExam = exam
    ? await hasPassedExam(student.id, exam.id)
    : false;
  const allLessonsCompleted = lessons.every((l) => statusMap.get(l.id) === "completed");
  const examUnlocked = !!exam && allLessonsCompleted;

  if (!canAccessModule) {
    return (
      <div className="space-y-6">
        <Link
          href="/modules"
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← Modules
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">
            Module locked
          </h1>
          <p className="mt-2 text-stone-600">
            Pass the previous module&apos;s exam to unlock this module.
          </p>
          <Link
            href="/modules"
            className="mt-6 inline-block rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Back to modules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/modules"
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← Modules
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {moduleData.title}
        </h1>
        {moduleData.description && (
          <p className="mt-2 text-stone-600">{moduleData.description}</p>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Lessons</h2>
        {lessons.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-600 text-sm">
            No lessons in this module yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {lessonsWithStatusList.map((lesson) => {
              const isLocked = lesson.status === "locked";
              return (
                <li
                  key={lesson.id}
                  className={`flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${
                    isLocked ? "opacity-75" : ""
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-sm font-medium text-stone-700">
                    {lesson.order_index}
                  </span>
                  <div className="min-w-0 flex-1">
                    {isLocked ? (
                      <h3 className="font-medium text-stone-500">
                        {lesson.title}
                      </h3>
                    ) : (
                      <Link
                        href={`/lessons/${lesson.slug}`}
                        className="font-medium text-stone-900 hover:text-stone-700 hover:underline"
                      >
                        {lesson.title}
                      </Link>
                    )}
                    {lesson.description && (
                      <p className="mt-1 text-sm text-stone-600 line-clamp-2">
                        {lesson.description}
                      </p>
                    )}
                    <div className="mt-2">{statusBadge(lesson.status)}</div>
                  </div>
                  {!isLocked && (
                    <span className="text-sm text-stone-500">
                      {lesson.status === "completed" ? "View" : "Start"} →
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {exam && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">
            Module exam
          </h2>
          {hasPassedThisExam ? (
            <p className="mt-2 text-stone-600">
              You have passed this exam. You can retake it if you want.
            </p>
          ) : !examUnlocked ? (
            <p className="mt-2 text-stone-600">
              Complete all lessons in this module to unlock the exam.
            </p>
          ) : null}
          {examUnlocked ? (
            <Link
              href={`/modules/${moduleData.slug}/exam`}
              className="mt-4 inline-flex rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              {hasPassedThisExam ? "Retake exam" : "Take exam"}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 inline-flex cursor-not-allowed rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-500"
            >
              Exam locked
            </button>
          )}
        </section>
      )}
    </div>
  );
}
