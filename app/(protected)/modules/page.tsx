import Link from "next/link";
import { ensureCurrentStudent } from "@/lib/students";
import { getPublishedModules } from "@/lib/modules";
import { getLessonCountByModuleId } from "@/lib/lessons";
import { getModuleAccessMap } from "@/lib/module-gate";
import { getExamByModuleId, hasPassedExam } from "@/lib/exams";

export default async function ModulesPage() {
  const { student } = await ensureCurrentStudent();
  const modules = await getPublishedModules();
  const lessonCounts = await Promise.all(
    modules.map((m) => getLessonCountByModuleId(m.id))
  );

  const moduleAccessMap = student
    ? await getModuleAccessMap(student.id, modules)
    : new Map<number, boolean>();

  const orderedModules = [...modules].sort((a, b) => a.order_index - b.order_index);

  const moduleStateMap = new Map<number, "locked" | "available" | "completed">();
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
  }

  function stateBadge(state: "locked" | "available" | "completed") {
    const label =
      state === "completed"
        ? "Completed"
        : state === "available"
          ? "Available"
          : "Locked";
    const cls =
      state === "completed"
        ? "cb-badge cb-badge-completed"
        : state === "available"
          ? "cb-badge cb-badge-available"
          : "cb-badge cb-badge-locked";
    return <span className={cls}>{label}</span>;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="cb-display">Modules</h1>
        <p className="cb-body max-w-2xl">
          Each module is a training block. Complete lessons and pass the exam to
          unlock the next one.
        </p>
      </section>
      {orderedModules.length === 0 ? (
        <div className="cb-panel p-6 sm:p-8 text-center">
          <div className="cb-caption">No published modules yet.</div>
        </div>
      ) : (
        <ul className="space-y-3">
          {orderedModules.map((mod, i) => {
            const state = moduleStateMap.get(mod.id) ?? "locked";
            const canOpen = state === "available" || state === "completed";
            const lessonCount = lessonCounts[i];
            return (
              <li key={mod.id}>
                {canOpen ? (
                  <Link
                    href={`/modules/${mod.slug}`}
                    className="group cb-panel block p-5 sm:p-6 hover:bg-white/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold tracking-[0.18em] uppercase text-stone-500 dark:text-stone-400 dark:group-hover:text-stone-900">
                            Module {mod.order_index}
                          </span>
                          {stateBadge(state)}
                        </div>
                        <h2 className="mt-2 text-lg font-semibold text-stone-900 dark:text-stone-50 dark:group-hover:text-stone-900 leading-snug">
                          {mod.title}
                        </h2>
                        {mod.short_description && (
                          <p className="cb-caption mt-1 line-clamp-2">
                            {mod.short_description}
                          </p>
                        )}
                        <p className="cb-caption mt-3">
                          {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-stone-800 dark:text-stone-200 dark:group-hover:text-stone-900 pt-1">
                        Open
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="cb-panel p-5 sm:p-6 opacity-60">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold tracking-[0.18em] uppercase text-stone-500 dark:text-stone-400">
                            Module {mod.order_index}
                          </span>
                          {stateBadge(state)}
                        </div>
                        <h2 className="mt-2 text-lg font-semibold text-stone-900 dark:text-stone-50 leading-snug">
                          {mod.title}
                        </h2>
                        {mod.short_description && (
                          <p className="cb-caption mt-1 line-clamp-2">
                            {mod.short_description}
                          </p>
                        )}
                        <p className="cb-caption mt-3">
                          {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-sm pt-1">
                        <span className="cb-caption">
                          Unlock after previous exam
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
