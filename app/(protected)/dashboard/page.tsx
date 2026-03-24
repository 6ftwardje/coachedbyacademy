import Link from "next/link";
import { ensureCurrentStudent } from "@/lib/students";
import { getDashboardStats } from "@/lib/dashboard";
import { getPublishedModules } from "@/lib/modules";
import { getModuleAccessMap } from "@/lib/module-gate";
import { getLessonCountByModuleId } from "@/lib/lessons";
import { getExamByModuleId, hasPassedExam } from "@/lib/exams";
import type { Module } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPageLayout } from "@/components/layout/AppPageLayout";
import { RightRailCard } from "@/components/layout/RightRailCard";
import { ContentSection } from "@/components/layout/ContentSection";
import { ModuleStateBadge } from "@/components/StatusBadge";
import { asText } from "@/lib/as-text";

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

  const completedModules = orderedModules.filter(
    (m) => moduleStateMap.get(m.id) === "completed"
  ).length;
  const availableOrDone = orderedModules.filter(
    (m) => moduleStateMap.get(m.id) !== "locked"
  ).length;

  function moduleLockedCopy(mod: Module) {
    if (mod.order_index === 1) return "Available";
    return "Unlock after previous exam";
  }

  const welcomeTitle = student?.name
    ? `Welcome back, ${student.name.split(" ")[0]}`
    : "Your academy workspace";

  const featuredShort = featuredModule
    ? asText(featuredModule.short_description)
    : null;

  const rail = (
    <>
      <RightRailCard title="Next move">
        <p className="cb-body text-sm leading-relaxed">
          {featuredModule ? (
            <>
              Continue{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {featuredModule.title}
              </span>
              . Work through lessons in order, then finish the module exam.
            </>
          ) : (
            "Your training path will appear here when modules are published."
          )}
        </p>
        {featuredModule && (
          <Link
            href={`/modules/${featuredModule.slug}`}
            className="mt-5 inline-flex cb-btn cb-btn-primary px-5"
          >
            Open module
          </Link>
        )}
      </RightRailCard>

      <RightRailCard title="Snapshot">
        <dl className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="cb-caption">Modules open</dt>
            <dd className="text-sm font-semibold text-[var(--foreground)]">
              {availableOrDone} / {orderedModules.length || "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="cb-caption">Exams cleared</dt>
            <dd className="text-sm font-semibold text-[var(--foreground)]">
              {completedModules}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="cb-caption">Lesson library</dt>
            <dd className="text-sm font-semibold text-[var(--foreground)]">
              {stats.totalLessons}
            </dd>
          </div>
        </dl>
      </RightRailCard>

      <RightRailCard title="Orientation">
        <p className="cb-caption leading-relaxed">
          The Academy is sequenced: each module unlocks when you pass the
          previous exam. Keep your focus on one block at a time.
        </p>
      </RightRailCard>
    </>
  );

  const main = (
    <>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_1px_0_rgba(28,25,23,0.04)] sm:p-6 lg:p-8">
        <div className="cb-eyebrow">Members workspace</div>
        <p className="mt-3 max-w-2xl text-lg font-semibold leading-snug text-[var(--foreground)] sm:text-xl">
          Your training path is built for progression. Complete lessons, pass
          exams, unlock the next block.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {featuredModule ? (
            <Link
              href={`/modules/${featuredModule.slug}`}
              className="cb-btn cb-btn-primary w-full sm:w-auto"
            >
              Continue training
            </Link>
          ) : (
            <span className="cb-btn cb-btn-secondary w-full cursor-default text-[var(--muted)] sm:w-auto">
              No modules available
            </span>
          )}
          <Link
            href="/modules"
            className="cb-btn cb-btn-secondary w-full sm:w-auto"
          >
            Browse academy
          </Link>
        </div>
      </section>

      <section className="cb-panel p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="cb-eyebrow">Academy overview</div>
            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
              Library scale and what’s ahead.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 sm:gap-10">
            <div>
              <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Published
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {stats.publishedModules}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Lessons
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {stats.totalLessons}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Total modules
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {stats.totalModules}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <ContentSection
        eyebrow="Current focus"
        title="Training block"
        description="Your next milestone in the sequence."
      >
        {featuredModule ? (
          <Link
            href={`/modules/${featuredModule.slug}`}
            className="group block rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-[0_1px_0_rgba(28,25,23,0.04)] transition-colors hover:border-[color-mix(in_oklab,var(--foreground)_28%,var(--border)_72%)]"
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Module {featuredModule.order_index}
                  </span>
                  <ModuleStateBadge
                    state={moduleStateMap.get(featuredModule.id) ?? "locked"}
                  />
                </div>
                <h2 className="text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">
                  {featuredModule.title}
                </h2>
                {featuredShort && (
                  <p className="cb-caption line-clamp-2">
                    {featuredShort}
                  </p>
                )}
                <p className="text-sm font-medium text-[var(--muted)]">
                  {featuredLessonCount} lessons in this block
                </p>
              </div>
              <div className="shrink-0 lg:text-right">
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Status
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  In progress
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
            <p className="cb-caption">No published modules yet.</p>
          </div>
        )}
      </ContentSection>

      <ContentSection
        eyebrow="Sequence"
        title="Modules"
        description="Each block unlocks when you pass the previous exam."
      >
        {orderedModules.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
            <p className="cb-caption">No published modules yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orderedModules.map((mod) => {
              const state = moduleStateMap.get(mod.id) ?? "locked";
              const canOpen = state === "available" || state === "completed";
              const shortDesc = asText(mod.short_description);
              if (canOpen) {
                return (
                  <li key={mod.id}>
                    <Link
                      href={`/modules/${mod.slug}`}
                      className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 transition-colors hover:border-[color-mix(in_oklab,var(--foreground)_28%,var(--border)_72%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)_22%,transparent)]"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                              Module {mod.order_index}
                            </span>
                            <ModuleStateBadge state={state} />
                          </div>
                          <h3 className="mt-2 text-base font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
                            {mod.title}
                          </h3>
                          {shortDesc && (
                            <p className="cb-caption mt-1 line-clamp-2">
                              {shortDesc}
                            </p>
                          )}
                        </div>
                        <div className="pt-1 text-sm font-semibold text-[var(--foreground)]">
                          Open
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              }

              return (
                <li
                  key={mod.id}
                  className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_92%,var(--muted)_8%)] p-4 sm:p-5 opacity-60"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                          Module {mod.order_index}
                        </span>
                        <ModuleStateBadge state={state} />
                      </div>
                      <h3 className="mt-2 text-base font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
                        {mod.title}
                      </h3>
                      {shortDesc && (
                        <p className="cb-caption mt-1 line-clamp-2">
                          {shortDesc}
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
      </ContentSection>
    </>
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Academy", href: "/modules" },
          { label: "Dashboard" },
        ]}
        title={welcomeTitle}
        description="A calm, structured workspace for your certification path. Progress unlocks one block at a time."
      />
      <AppPageLayout main={main} rail={rail} />
    </div>
  );
}
