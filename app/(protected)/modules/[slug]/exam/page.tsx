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
            Access required
          </h1>
          <p className="mt-2 cb-caption">
            Pass the previous module&apos;s exam to access this module.
          </p>
          <Link href="/modules" className="mt-6 cb-btn cb-btn-primary">
            Back to modules <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-6">
        <Link
          href={`/modules/${moduleData.slug}`}
          className="text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
        >
          ← {moduleData.title}
        </Link>
        <div className="cb-panel p-8 text-center">
          <div className="cb-eyebrow">No exam available</div>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Nothing to submit
          </h1>
          <p className="mt-2 cb-caption">
            This module does not have an exam configured.
          </p>
          <Link
            href={`/modules/${moduleData.slug}`}
            className="mt-6 cb-btn cb-btn-primary"
          >
            Back to module <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!examUnlocked) {
    return (
      <div className="space-y-6">
        <Link
          href={`/modules/${moduleData.slug}`}
          className="text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
        >
          ← {moduleData.title}
        </Link>
        <div className="cb-panel p-8 text-center">
          <div className="cb-eyebrow">Exam locked</div>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Finish the work first
          </h1>
          <p className="mt-2 cb-caption">
            Complete all lessons in this module to unlock the exam.
          </p>
          <Link
            href={`/modules/${moduleData.slug}`}
            className="mt-6 cb-btn cb-btn-primary"
          >
            Back to module <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    );
  }

  const questions = await getExamQuestions(exam.id);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/modules/${moduleData.slug}`}
          className="text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
        >
          ← {moduleData.title}
        </Link>

        <div className="cb-eyebrow mt-4">Module exam</div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-50 tracking-tight uppercase">
          {exam.title}
        </h1>
        {exam.description && (
          <p className="mt-3 cb-body max-w-3xl">{exam.description}</p>
        )}
        <p className="mt-3 cb-caption">
          Passing score:{" "}
          <span className="font-semibold text-stone-900 dark:text-stone-50">
            {exam.passing_score}%
          </span>
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="cb-panel p-8 text-center">
          <div className="cb-caption">No questions in this exam yet.</div>
          <Link
            href={`/modules/${moduleData.slug}`}
              className="mt-6 inline-flex text-sm font-semibold text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
          >
            Back to module <span aria-hidden>→</span>
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
      )}
    </div>
  );
}
