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
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← Modules
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">
            Module locked
          </h1>
          <p className="mt-2 text-stone-600">
            Pass the previous module&apos;s exam to access this module.
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

  if (!exam) {
    return (
      <div className="space-y-6">
        <Link
          href={`/modules/${moduleData.slug}`}
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← {moduleData.title}
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">
            No exam available
          </h1>
          <p className="mt-2 text-stone-600">
            This module does not have an exam configured.
          </p>
          <Link
            href={`/modules/${moduleData.slug}`}
            className="mt-6 inline-block rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Back to module
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
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← {moduleData.title}
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">
            Exam locked
          </h1>
          <p className="mt-2 text-stone-600">
            Complete all lessons in this module to unlock the exam.
          </p>
          <Link
            href={`/modules/${moduleData.slug}`}
            className="mt-6 inline-block rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Back to module
          </Link>
        </div>
      </div>
    );
  }

  const questions = await getExamQuestions(exam.id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/modules/${moduleData.slug}`}
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← {moduleData.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {exam.title}
        </h1>
        {exam.description && (
          <p className="mt-2 text-stone-600">{exam.description}</p>
        )}
        <p className="mt-1 text-sm text-stone-500">
          Passing score: {exam.passing_score}%
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-stone-600">No questions in this exam yet.</p>
          <Link
            href={`/modules/${moduleData.slug}`}
            className="mt-4 inline-block text-sm font-medium text-stone-700 hover:text-stone-900"
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
      )}
    </div>
  );
}
