import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureCurrentStudent } from "@/lib/students";
import { getModuleBySlug } from "@/lib/modules";
import { getPublishedLessonsByModuleId } from "@/lib/lessons";
import { getExamByModuleId, getExamQuestions } from "@/lib/exams";
import { areAllLessonsCompleted } from "@/lib/progress";
import { getModuleAccessMap } from "@/lib/module-gate";
import { getPublishedModules } from "@/lib/modules";
import { ExamForm } from "./ExamForm";
import { asText } from "@/lib/as-text";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPageLayout } from "@/components/layout/AppPageLayout";
import { RightRailCard } from "@/components/layout/RightRailCard";

type Props = { params: Promise<{ slug: string }> };

export default async function ModuleExamPage({ params }: Props) {
  const { slug } = await params;
  const moduleData = await getModuleBySlug(slug);
  if (!moduleData) notFound();

  const { student } = await ensureCurrentStudent();
  if (!student) notFound();

  const [exam, lessons, allModules] = await Promise.all([
    getExamByModuleId(moduleData.id),
    getPublishedLessonsByModuleId(moduleData.id),
    getPublishedModules(),
  ]);

  const moduleAccessMap = await getModuleAccessMap(student.id, allModules);
  const canAccessModule = moduleAccessMap.get(moduleData.id) === true;
  const lessonIds = lessons.map((l) => l.id);
  const allLessonsCompleted = await areAllLessonsCompleted(student.id, lessonIds);
  const examUnlocked = !!exam && allLessonsCompleted;

  if (!canAccessModule) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[
            { label: "Academy", href: "/modules" },
            { label: "Exam" },
          ]}
          eyebrow="Access"
          title="Module locked"
          description="Pass the previous module’s exam to access this assessment."
        />
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center sm:p-10">
          <Link href="/modules" className="cb-btn cb-btn-primary">
            Back to modules
          </Link>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[
            { label: "Academy", href: "/modules" },
            { label: moduleData.title, href: `/modules/${moduleData.slug}` },
            { label: "Exam" },
          ]}
          eyebrow="Assessment"
          title="No exam configured"
          description="This module does not have an exam yet."
        />
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center sm:p-10">
          <Link
            href={`/modules/${moduleData.slug}`}
            className="cb-btn cb-btn-primary"
          >
            Back to module
          </Link>
        </div>
      </div>
    );
  }

  if (!examUnlocked) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[
            { label: "Academy", href: "/modules" },
            { label: moduleData.title, href: `/modules/${moduleData.slug}` },
            { label: "Exam" },
          ]}
          eyebrow="Assessment"
          title="Exam locked"
          description="Complete every lesson in this module before you submit the exam."
        />
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center sm:p-10">
          <Link
            href={`/modules/${moduleData.slug}`}
            className="cb-btn cb-btn-primary"
          >
            Back to module
          </Link>
        </div>
      </div>
    );
  }

  const questions = await getExamQuestions(exam.id);

  const rail = (
    <>
      <RightRailCard title="Assessment rules">
        <ul className="space-y-3 cb-caption">
          <li>Answer every question before you submit.</li>
          <li>
            Passing score:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {exam.passing_score}%
            </span>
            .
          </li>
          <li>Take your time. This is certification-level focus.</li>
        </ul>
      </RightRailCard>
      <RightRailCard title="Context">
        <p className="cb-caption leading-relaxed">
          Module:{" "}
          <span className="font-semibold text-[var(--foreground)]">{moduleData.title}</span>
        </p>
        <Link
          href={`/modules/${moduleData.slug}`}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Back to module
        </Link>
      </RightRailCard>
    </>
  );

  const main =
    questions.length === 0 ? (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <p className="cb-caption">No questions in this exam yet.</p>
        <Link
          href={`/modules/${moduleData.slug}`}
          className="mt-6 inline-flex text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Back to module
        </Link>
      </div>
    ) : (
      <ExamForm
        examId={exam.id}
        questions={questions}
        passingScore={exam.passing_score}
        moduleSlug={moduleData.slug}
        moduleTitle={moduleData.title}
      />
    );

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Academy", href: "/modules" },
          { label: moduleData.title, href: `/modules/${moduleData.slug}` },
          { label: "Exam" },
        ]}
        eyebrow="Module exam"
        title={exam.title}
        description={asText(exam.description) ?? undefined}
        meta={
          <span className="cb-caption">Passing: {exam.passing_score}%</span>
        }
      />
      <AppPageLayout main={main} rail={rail} />
    </div>
  );
}
