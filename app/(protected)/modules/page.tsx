import Link from "next/link";
import { ensureCurrentStudent } from "@/lib/students";
import { getPublishedModules } from "@/lib/modules";
import { getLessonCountByModuleId } from "@/lib/lessons";
import { getModuleAccessMap } from "@/lib/module-gate";
import { getExamByModuleId, hasPassedExam } from "@/lib/exams";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPageLayout } from "@/components/layout/AppPageLayout";
import { RightRailCard } from "@/components/layout/RightRailCard";
import { ModuleStateBadge } from "@/components/StatusBadge";
import { asText } from "@/lib/as-text";

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

  const rail = (
    <>
      <RightRailCard title="How it works">
        <p className="cb-body text-sm leading-relaxed">
          Each module is a focused training block. Complete lessons in order,
          then pass the exam to unlock the next sequence.
        </p>
      </RightRailCard>
      <RightRailCard title="Discipline">
        <p className="cb-caption leading-relaxed">
          One block at a time. Quality reps beat rushing through content.
        </p>
      </RightRailCard>
    </>
  );

  const main =
    orderedModules.length === 0 ? (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 text-center">
        <p className="cb-caption">No published modules yet.</p>
      </div>
    ) : (
      <ul className="space-y-3">
          {orderedModules.map((mod, i) => {
            const state = moduleStateMap.get(mod.id) ?? "locked";
            const canOpen = state === "available" || state === "completed";
            const lessonCount = lessonCounts[i];
            const shortDesc = asText(mod.short_description);
            return (
            <li key={mod.id}>
              {canOpen ? (
                <Link
                  href={`/modules/${mod.slug}`}
                  className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 transition-colors hover:border-[color-mix(in_oklab,var(--foreground)_28%,var(--border)_72%)]"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                          Module {mod.order_index}
                        </span>
                        <ModuleStateBadge state={state} />
                      </div>
                      <h2 className="mt-2 text-lg font-semibold leading-snug text-[var(--foreground)]">
                        {mod.title}
                      </h2>
                        {shortDesc && (
                          <p className="cb-caption mt-1 line-clamp-2">
                            {shortDesc}
                          </p>
                        )}
                        <p className="cb-caption mt-3">
                          {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="pt-1 text-sm font-semibold text-[var(--foreground)]">
                        Open
                      </div>
                  </div>
                </Link>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_92%,var(--muted)_8%)] p-5 sm:p-6 opacity-70">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                          Module {mod.order_index}
                        </span>
                        <ModuleStateBadge state={state} />
                      </div>
                      <h2 className="mt-2 text-lg font-semibold leading-snug text-[var(--foreground)]">
                        {mod.title}
                      </h2>
                      {shortDesc && (
                        <p className="cb-caption mt-1 line-clamp-2">
                          {shortDesc}
                        </p>
                      )}
                      <p className="cb-caption mt-3">
                        {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="pt-1 text-sm">
                      <span className="cb-caption">Unlock after previous exam</span>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Academy" }]}
        eyebrow="Training library"
        title="Modules"
        description="Sequential blocks. Complete the work, pass the exam, unlock what’s next."
      />
      <AppPageLayout main={main} rail={rail} />
    </div>
  );
}
