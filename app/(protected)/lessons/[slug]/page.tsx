import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureCurrentStudent } from "@/lib/students";
import { getLessonBySlug, getPublishedLessonsByModuleId } from "@/lib/lessons";
import { getModuleById } from "@/lib/modules";
import { getLessonStatuses } from "@/lib/lesson-gate";
import { getProgressByLessonIds } from "@/lib/progress";
import { getExamByModuleId } from "@/lib/exams";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { MarkCompleteButton } from "./MarkCompleteButton";

type Props = { params: Promise<{ slug: string }> };

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) notFound();

  const { student } = await ensureCurrentStudent();
  if (!student) notFound();

  const allLessons = await getPublishedLessonsByModuleId(lesson.module_id);
  const [moduleData, statusMap, progressMap, exam] = await Promise.all([
      getModuleById(lesson.module_id),
      getLessonStatuses(student.id, allLessons),
      getProgressByLessonIds(student.id, allLessons.map((l) => l.id)),
      getExamByModuleId(lesson.module_id),
    ]);

  if (!moduleData) notFound();

  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const status = statusMap.get(lesson.id) ?? "locked";
  const isCompleted = progressMap.get(lesson.id)?.watched === true;
  const canAccess = status === "available" || status === "completed";

  const prevLesson =
    currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;
  const isLastLesson = nextLesson === null && allLessons.length > 0;
  const allLessonsCompleted = allLessons.every(
    (l) => progressMap.get(l.id)?.watched === true
  );
  const examAvailable = !!exam && allLessonsCompleted;

  if (!canAccess) {
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
            Lesson locked
          </h1>
          <p className="mt-2 text-stone-600">
            Complete the previous lesson in this module to unlock this one.
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

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/modules/${moduleData.slug}`}
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← {moduleData.title}
        </Link>
        <p className="mt-1 text-xs font-medium text-stone-500">
          Lesson {lesson.order_index} of {allLessons.length}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="mt-2 text-stone-600">{lesson.description}</p>
        )}
      </div>

      <VimeoPlayer
        videoUrl={lesson.video_url}
        videoProvider={lesson.video_provider}
        title={lesson.title}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isCompleted ? (
            <span className="inline-flex items-center rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              Completed
            </span>
          ) : (
            <MarkCompleteButton lessonId={lesson.id} />
          )}
        </div>
      </div>

      <nav
        className="flex flex-col gap-4 border-t border-stone-200 pt-8 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Lesson navigation"
      >
        <div>
          {prevLesson ? (
            <Link
              href={`/lessons/${prevLesson.slug}`}
              className="text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              ← Previous: {prevLesson.title}
            </Link>
          ) : (
            <span className="text-sm text-stone-400">No previous lesson</span>
          )}
        </div>
        <div className="text-right">
          {nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.slug}`}
              className="inline-flex items-center rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Next: {nextLesson.title} →
            </Link>
          ) : isLastLesson && examAvailable ? (
            <Link
              href={`/modules/${moduleData.slug}/exam`}
              className="inline-flex items-center rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Take module exam →
            </Link>
          ) : isLastLesson ? (
            <p className="text-sm text-stone-500">
              Complete this lesson to unlock the module exam.
            </p>
          ) : (
            <span className="text-sm text-stone-400">No next lesson</span>
          )}
        </div>
      </nav>
    </div>
  );
}
