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
        <span className="cb-badge cb-badge-completed">Completed</span>
      );
    case "available":
      return (
        <span className="cb-badge cb-badge-available">Available</span>
      );
    case "locked":
      return (
        <span className="cb-badge cb-badge-locked">Locked</span>
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
          className="text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
        >
          ← Modules
        </Link>
        <div className="cb-panel p-8 text-center">
          <div className="cb-eyebrow">Module locked</div>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Unlock your next block
          </h1>
          <p className="mt-2 cb-caption">
            Pass the previous module&apos;s exam to unlock this module.
          </p>
          <Link href="/modules" className="mt-6 cb-btn cb-btn-primary">
            Back to modules <span aria-hidden>→</span>
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
          className="text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
        >
          ← Modules
        </Link>
        <div className="cb-eyebrow mt-4">
          Module {moduleData.order_index}
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-50 tracking-tight uppercase">
          {moduleData.title}
        </h1>
        {moduleData.description && (
          <p className="mt-2 cb-body max-w-3xl">{moduleData.description}</p>
        )}
      </div>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <div className="cb-eyebrow">Lessons</div>
            <div className="mt-2 cb-h2">Your session sequence</div>
          </div>
          <div className="hidden sm:block cb-caption">
            Work through in order. Status updates after completion.
          </div>
        </div>
        {lessons.length === 0 ? (
          <div className="cb-panel p-6">
            <div className="cb-caption">No lessons in this module yet.</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {lessonsWithStatusList.map((lesson) => {
              const isLocked = lesson.status === "locked";
              return (
                <li key={lesson.id} className={isLocked ? "opacity-50" : ""}>
                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className={[
                      "cb-panel block p-4 sm:p-5 transition-colors focus:outline-none",
                      isLocked
                        ? "hover:bg-white/60 dark:hover:bg-white/10"
                        : "hover:bg-white/80 dark:hover:bg-white/5",
                      "focus:ring-2 focus:ring-stone-900/10",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-start gap-4 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-sm font-semibold text-stone-800 dark:bg-white/10 dark:text-stone-200">
                          {lesson.order_index}
                        </span>
                        <div className="min-w-0">
                          <h3
                            className={[
                              "font-semibold leading-snug",
                              isLocked
                                ? "text-stone-600 dark:text-stone-400"
                                : "text-stone-900 dark:text-stone-50",
                            ].join(" ")}
                          >
                            {lesson.title}
                          </h3>
                          {lesson.description && (
                            <p className="cb-caption mt-1 line-clamp-2">
                              {lesson.description}
                            </p>
                          )}
                          <div className="mt-3">{statusBadge(lesson.status)}</div>
                        </div>
                      </div>

                      <div className="pt-1">
                        <span
                          className={[
                            "text-sm font-semibold",
                            isLocked
                              ? "text-stone-500 dark:text-stone-400"
                              : "text-stone-800 dark:text-stone-200",
                          ].join(" ")}
                        >
                          <span aria-hidden>→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {exam && (
        <section className="cb-panel p-6 sm:p-7">
          <div className="cb-eyebrow">Milestone</div>
          <h2 className="mt-2 cb-h2">Module exam</h2>

          {hasPassedThisExam ? (
            <p className="mt-2 cb-body max-w-2xl">
              You passed this exam. Retake it when you want to tighten your
              certification.
            </p>
          ) : !examUnlocked ? (
            <p className="mt-2 cb-body max-w-2xl">
              Complete all lessons in this module to unlock the exam.
            </p>
          ) : null}

          {examUnlocked ? (
            <Link
              href={`/modules/${moduleData.slug}/exam`}
              className="mt-5 cb-btn cb-btn-primary"
            >
              {hasPassedThisExam ? "Retake exam" : "Take exam"}{" "}
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 cb-btn cb-btn-secondary opacity-60 cursor-not-allowed"
            >
              Exam locked
            </button>
          )}
        </section>
      )}
    </div>
  );
}
