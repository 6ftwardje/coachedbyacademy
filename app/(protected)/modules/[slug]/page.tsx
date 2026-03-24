import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureCurrentStudent } from "@/lib/students";
import { getModuleBySlug } from "@/lib/modules";
import { getPublishedLessonsByModuleId } from "@/lib/lessons";
import { getLessonStatuses, lessonsWithStatus } from "@/lib/lesson-gate";
import { getModuleAccessMap } from "@/lib/module-gate";
import { getExamByModuleId, hasPassedExam } from "@/lib/exams";
import { getPublishedModules } from "@/lib/modules";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPageLayout } from "@/components/layout/AppPageLayout";
import { RightRailCard } from "@/components/layout/RightRailCard";
import { ContentSection } from "@/components/layout/ContentSection";
import { LessonStatusBadge } from "@/components/StatusBadge";
import { asText } from "@/lib/as-text";

type Props = { params: Promise<{ slug: string }> };

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

  const completedCount = lessons.filter(
    (l) => statusMap.get(l.id) === "completed"
  ).length;

  const moduleIntroText = asText(moduleData.description);

  if (!canAccessModule) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[
            { label: "Academy", href: "/modules" },
            { label: "Module" },
          ]}
          eyebrow="Access"
          title="This module is locked"
          description="Pass the previous module’s exam to unlock the next training block."
        />
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center sm:p-10">
          <Link href="/modules" className="cb-btn cb-btn-primary">
            Back to modules
          </Link>
        </div>
      </div>
    );
  }

  const rail = (
    <>
      <RightRailCard title="Module">
        <dl className="space-y-4">
          <div>
            <dt className="cb-caption">Position</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              Block {moduleData.order_index}
            </dd>
          </div>
          <div>
            <dt className="cb-caption">Lessons</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {completedCount} / {lessons.length} complete
            </dd>
          </div>
          {exam && (
            <div>
              <dt className="cb-caption">Exam</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {hasPassedThisExam
                  ? "Passed"
                  : examUnlocked
                    ? "Ready to take"
                    : "Unlock after lessons"}
              </dd>
            </div>
          )}
        </dl>
      </RightRailCard>

      {exam && (
        <RightRailCard title="Milestone">
          <p className="cb-caption leading-relaxed">
            {hasPassedThisExam
              ? "Exam cleared. You can retake anytime to sharpen your standard."
              : examUnlocked
                ? "All lessons complete. Submit the exam when you’re ready."
                : "Finish every lesson in this block to unlock the exam."}
          </p>
          {examUnlocked ? (
            <Link
              href={`/modules/${moduleData.slug}/exam`}
              className="mt-5 inline-flex cb-btn cb-btn-primary w-full justify-center"
            >
              {hasPassedThisExam ? "Retake exam" : "Take exam"}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 w-full cb-btn cb-btn-secondary cursor-not-allowed opacity-60"
            >
              Exam locked
            </button>
          )}
        </RightRailCard>
      )}
    </>
  );

  const main = (
    <>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 lg:p-8">
        <div className="cb-eyebrow">Inside this block</div>
        {moduleIntroText ? (
          <p className="mt-4 cb-body max-w-3xl">{moduleIntroText}</p>
        ) : (
          <p className="mt-4 cb-caption">
            Work through the sessions below in order. Completion unlocks what’s
            next.
          </p>
        )}
      </section>

      <ContentSection
        eyebrow="Sessions"
        title="Lesson sequence"
        description="Work in order. Status updates when each session is complete."
      >
        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="cb-caption">No lessons in this module yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {lessonsWithStatusList.map((lesson) => {
              const isLocked = lesson.status === "locked";
              const lessonDesc = asText(lesson.description);
              return (
                <li key={lesson.id} className={isLocked ? "opacity-55" : ""}>
                  {isLocked ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_88%,var(--muted)_12%)] p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-semibold text-[var(--muted)]">
                            {lesson.order_index}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-snug text-[var(--muted)]">
                              {lesson.title}
                            </h3>
                            {lessonDesc && (
                              <p className="cb-caption mt-1 line-clamp-2">{lessonDesc}</p>
                            )}
                            <div className="mt-3">
                              <LessonStatusBadge status={lesson.status} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/lessons/${lesson.slug}`}
                      className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 transition-colors hover:border-[color-mix(in_oklab,var(--foreground)_28%,var(--border)_72%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)_22%,transparent)]"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-semibold text-[var(--muted)] transition-colors group-hover:border-[var(--foreground)] group-hover:text-[var(--foreground)]">
                            {lesson.order_index}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-snug text-[var(--foreground)]">
                              {lesson.title}
                            </h3>
                            {lessonDesc && (
                              <p className="cb-caption mt-1 line-clamp-2 transition-colors group-hover:text-[color-mix(in_oklab,var(--foreground)_78%,var(--muted)_22%)]">
                                {lessonDesc}
                              </p>
                            )}
                            <div className="mt-3">
                              <LessonStatusBadge status={lesson.status} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ContentSection>

      {exam && (
        <section className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_90%,var(--muted)_10%)] p-5 sm:p-6 lg:hidden">
          <div className="cb-eyebrow">Milestone</div>
          <h2 className="mt-2 cb-section-title">Module exam</h2>
          {hasPassedThisExam ? (
            <p className="mt-2 cb-body max-w-2xl">
              You passed this exam. Retake when you want to tighten your standard.
            </p>
          ) : !examUnlocked ? (
            <p className="mt-2 cb-body max-w-2xl">
              Complete all lessons in this module to unlock the exam.
            </p>
          ) : null}
          {examUnlocked ? (
            <Link
              href={`/modules/${moduleData.slug}/exam`}
              className="mt-5 inline-flex cb-btn cb-btn-primary"
            >
              {hasPassedThisExam ? "Retake exam" : "Take exam"}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 cb-btn cb-btn-secondary cursor-not-allowed opacity-60"
            >
              Exam locked
            </button>
          )}
        </section>
      )}
    </>
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Academy", href: "/modules" },
          { label: moduleData.title },
        ]}
        eyebrow={`Module ${moduleData.order_index}`}
        title={moduleData.title}
        meta={
          <span className="cb-caption">
            {completedCount}/{lessons.length} lessons
          </span>
        }
      />
      <AppPageLayout main={main} rail={rail} />
    </div>
  );
}
