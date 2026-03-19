import Link from "next/link";
import { ensureCurrentStudent } from "@/lib/students";
import { getDashboardStats } from "@/lib/dashboard";
import { getPublishedModules } from "@/lib/modules";
import { getModuleAccessMap } from "@/lib/module-gate";
import { getLessonCountByModuleId } from "@/lib/lessons";
import { getExamByModuleId, hasPassedExam } from "@/lib/exams";
import type { Module } from "@/lib/types";

export default async function DashboardPage() {
  const { student } = await ensureCurrentStudent();
  const [stats, modules] = await Promise.all([
    getDashboardStats(),
    getPublishedModules(),
  ]);

  const moduleAccessMap = student
    ? await getModuleAccessMap(student.id, modules)
    : new Map<number, boolean>();

  const orderedModules = [...modules].sort(
    (a, b) => a.order_index - b.order_index
  );

  const moduleStateMap = new Map<
    number,
    "locked" | "available" | "completed"
  >();

  if (student) {
    await Promise.all(
      orderedModules.map(async (mod) => {
        const canAccess = moduleAccessMap.get(mod.id) === true;
        if (!canAccess) {
          moduleStateMap.set(mod.id, "locked");
          return;
        }

        const exam = await getExamByModuleId(mod.id);
        if (!exam) {
          moduleStateMap.set(mod.id, "available");
          return;
        }

        const passed = await hasPassedExam(student.id, exam.id);
        moduleStateMap.set(mod.id, passed ? "completed" : "available");
      })
    );
  } else {
    for (const mod of orderedModules) {
      moduleStateMap.set(
        mod.id,
        moduleAccessMap.get(mod.id) === true ? "available" : "locked"
      );
    }
  }

  const featuredModule =
    orderedModules.find((m) => moduleStateMap.get(m.id) !== "locked") ??
    orderedModules[0] ??
    null;

  const featuredLessonCount = featuredModule
    ? await getLessonCountByModuleId(featuredModule.id)
    : 0;

  function stateBadge(
    state: "locked" | "available" | "completed"
  ) {
    const label =
      state === "completed" ? "Completed" : state === "available" ? "Available" : "Locked";
    const cls =
      state === "completed"
        ? "cb-badge cb-badge-completed"
        : state === "available"
          ? "cb-badge cb-badge-available"
          : "cb-badge cb-badge-locked";
    return <span className={cls}>{label}</span>;
  }

  function moduleLockedCopy(mod: Module) {
    if (mod.order_index === 1) return "Available";
    return "Unlock after previous exam";
  }

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="cb-eyebrow">CoachedBy Academy</div>
        <h1 className="cb-display">
          {student?.name ? `Welcome, ${student.name}` : "Dashboard"}
        </h1>
        <p className="cb-body max-w-2xl">
          Your training path is ready. Complete a lesson, then advance
          through each module exam.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {featuredModule ? (
            <Link
              href={`/modules/${featuredModule.slug}`}
              className="cb-btn cb-btn-primary w-full sm:w-auto"
            >
              Open next module <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className="cb-btn cb-btn-secondary w-full sm:w-auto text-stone-500 dark:text-stone-400">
              No modules available
            </span>
          )}

          <Link
            href="/modules"
            className="cb-btn cb-btn-secondary w-full sm:w-auto"
          >
            View all modules <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section className="cb-panel p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="cb-eyebrow">Academy overview</div>
            <div className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
              At a glance: your total library and lessons ahead.
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-8">
            <div>
              <dt className="text-xs font-semibold tracking-[0.14em] uppercase text-stone-500 dark:text-stone-400">
                Modules
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {stats.publishedModules}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.14em] uppercase text-stone-500 dark:text-stone-400">
                Lessons
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {stats.totalLessons}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.14em] uppercase text-stone-500 dark:text-stone-400">
                Total modules
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {stats.totalModules}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="cb-eyebrow">Featured training</div>
            <div className="mt-2 cb-h2">Your current focus block</div>
          </div>
        </div>

        {featuredModule ? (
          <Link
            href={`/modules/${featuredModule.slug}`}
            className="cb-panel block p-6 sm:p-7 hover:bg-white/80 transition-colors"
          >
            <div className="flex items-start justify-between gap-8">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold tracking-[0.18em] uppercase text-stone-500 dark:text-stone-400">
                    Module {featuredModule.order_index}
                  </span>
                  {stateBadge(
                    moduleStateMap.get(featuredModule.id) ?? "locked"
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-stone-50 leading-tight">
                  {featuredModule.title}
                </h2>
                {featuredModule.short_description && (
                  <p className="cb-caption line-clamp-2">
                    {featuredModule.short_description}
                  </p>
                )}
                <div className="flex items-center gap-4 pt-1">
                  <span className="cb-caption">{featuredLessonCount} lessons</span>
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    Enter <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <div className="text-xs font-semibold tracking-[0.18em] uppercase text-stone-500 dark:text-stone-400">
                  Next step
                </div>
                <div className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-50">
                  →
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="cb-panel p-6 sm:p-7">
            <div className="cb-caption">No published modules yet.</div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="cb-eyebrow">Training path</div>
            <div className="mt-2 cb-h2">Modules in sequence</div>
          </div>
        </div>

        {orderedModules.length === 0 ? (
          <div className="cb-panel p-6 sm:p-7">
            <div className="cb-caption">No published modules yet.</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {orderedModules.map((mod) => {
              const state = moduleStateMap.get(mod.id) ?? "locked";
              const canOpen = state === "available" || state === "completed";
              if (canOpen) {
                return (
                  <li key={mod.id}>
                    <Link
                      href={`/modules/${mod.slug}`}
                      className="cb-panel block p-4 sm:p-5 hover:bg-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-stone-500 dark:text-stone-400">
                              Module {mod.order_index}
                            </span>
                            {stateBadge(state)}
                          </div>
                          <h3 className="mt-2 text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-50 leading-snug">
                            {mod.title}
                          </h3>
                          {mod.short_description && (
                            <p className="cb-caption mt-1 line-clamp-2">
                              {mod.short_description}
                            </p>
                          )}
                        </div>

                        <div className="pt-1">
                          <span className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                            <span aria-hidden>→</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={mod.id}
                  className="cb-panel p-4 sm:p-5 opacity-60"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold tracking-[0.18em] uppercase text-stone-500 dark:text-stone-400">
                          Module {mod.order_index}
                        </span>
                        {stateBadge(state)}
                      </div>
                      <h3 className="mt-2 text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-50 leading-snug">
                        {mod.title}
                      </h3>
                      {mod.short_description && (
                        <p className="cb-caption mt-1 line-clamp-2">
                          {mod.short_description}
                        </p>
                      )}
                    </div>

                    <div className="pt-1">
                      <span className="cb-caption">{moduleLockedCopy(mod)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
