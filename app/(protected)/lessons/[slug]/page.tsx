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
          className="text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
        >
          ← {moduleData.title}
        </Link>
        <div className="cb-panel p-8 text-center">
          <div className="cb-eyebrow">Lesson locked</div>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
            Earn your access
          </h1>
          <p className="mt-2 cb-caption">
            Complete the previous lesson in this module to unlock this one.
          </p>
          <Link href={`/modules/${moduleData.slug}`} className="mt-6 cb-btn cb-btn-primary">
            Back to module <span aria-hidden>→</span>
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
          className="text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
        >
          ← {moduleData.title}
        </Link>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <div className="cb-eyebrow">
              Module {moduleData.order_index} · Lesson {lesson.order_index}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-50 tracking-tight uppercase">
              {lesson.title}
            </h1>
          </div>
          <p className="cb-caption sm:text-right">
            {lesson.order_index} of {allLessons.length}
          </p>
        </div>

        {lesson.description && (
          <p className="mt-3 cb-body max-w-3xl">{lesson.description}</p>
        )}
      </div>

      <section className="cb-panel p-4 sm:p-5">
        <VimeoPlayer
          videoUrl={lesson.video_url}
          videoProvider={lesson.video_provider}
          title={lesson.title}
        />
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[42px]">
          {isCompleted ? (
            <span className="cb-badge cb-badge-completed">Completed</span>
          ) : (
            <MarkCompleteButton lessonId={lesson.id} />
          )}
        </div>
      </div>

      <nav
        className="flex flex-col gap-4 border-t border-stone-200/70 pt-8 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Lesson navigation"
      >
        <div>
          {prevLesson ? (
            <Link
              href={`/lessons/${prevLesson.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-50"
            >
              <span aria-hidden>←</span> Previous: {prevLesson.title}
            </Link>
          ) : (
            <span className="text-sm text-stone-400 dark:text-stone-300">
              No previous lesson
            </span>
          )}
        </div>
        <div className="text-right">
          {nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.slug}`}
              className="cb-btn cb-btn-primary inline-flex"
            >
              Next: {nextLesson.title} <span aria-hidden>→</span>
            </Link>
          ) : isLastLesson && examAvailable ? (
            <Link
              href={`/modules/${moduleData.slug}/exam`}
              className="cb-btn cb-btn-primary inline-flex"
            >
              Take module exam <span aria-hidden>→</span>
            </Link>
          ) : isLastLesson ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Complete this lesson to unlock the module exam.
            </p>
          ) : (
            <span className="text-sm text-stone-400 dark:text-stone-300">
              No next lesson
            </span>
          )}
        </div>
      </nav>
    </div>
  );
}
