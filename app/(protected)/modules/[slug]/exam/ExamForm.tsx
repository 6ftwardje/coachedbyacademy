"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitModuleExam } from "@/app/actions/exam";
import type { SerializedExamAttempt } from "@/lib/types";

type Props = {
  attempt: SerializedExamAttempt;
  passingScore: number;
  moduleSlug: string;
};

export function ExamForm({
  attempt,
  passingScore,
  moduleSlug,
}: Props) {
  const router = useRouter();
  const questions = attempt.questions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((q) => answers[q.id] != null).length;
  const allAnswered = questions.every((q) => answers[q.id] != null);
  const currentAnswered = currentQuestion
    ? answers[currentQuestion.id] != null
    : false;
  const canSubmit = allAnswered && !submitting && !result;
  const progressValue =
    questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const answersList = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id],
    }));

    submitModuleExam(attempt.attemptId, answersList).then((res) => {
      setSubmitting(false);
      if (res.success && res.score != null && res.passed != null) {
        setResult({ score: res.score, passed: res.passed });
        router.refresh();
      } else {
        setError(res.error ?? "Indienen mislukt.");
      }
    });
  }

  if (result) {
    return (
      <div className="cb-panel p-8">
        <div className="cb-eyebrow">Resultaat</div>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)] tracking-tight">
          Score: {result.score}%
        </h2>

        <div className="mt-3">
          {result.passed ? (
            <div className="space-y-3">
              <span className="cb-badge cb-badge-completed">Geslaagd</span>
              <p className="cb-body">Je volgende module komt nu vrij.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="cb-badge cb-badge-locked">Niet geslaagd</span>
              <p className="cb-body">Je hebt {passingScore}% nodig om te slagen.</p>
            </div>
          )}
        </div>

        <div className="mt-7 flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <Link
            href={`/modules/${moduleSlug}`}
            className="cb-btn cb-btn-secondary"
          >
            Terug naar module
          </Link>

          {result.passed && (
            <Link href="/modules" className="cb-btn cb-btn-primary">
              Ga naar de volgende module
            </Link>
          )}

          {!result.passed && (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswers({});
                router.refresh();
              }}
              className="cb-btn cb-btn-primary"
            >
              Toets opnieuw maken
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="cb-panel p-8">
        <p className="cb-caption">Deze poging bevat geen vragen.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset className="cb-panel p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <legend className="cb-eyebrow">
            Vraag {currentIndex + 1} van {questions.length}
          </legend>
          <span className="cb-caption">{answeredCount} beantwoord</span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--border)_70%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--foreground)] transition-[width]"
            style={{ width: `${progressValue}%` }}
          />
        </div>

        <p className="mt-6 text-xl font-semibold leading-snug text-[var(--foreground)]">
          {currentQuestion.questionText}
        </p>

        <div className="mt-5 space-y-2">
          {currentQuestion.options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:bg-[color-mix(in_oklab,var(--card)_85%,var(--muted)_15%)] has-[:checked]:border-[var(--foreground)] has-[:checked]:bg-[color-mix(in_oklab,var(--card)_78%,var(--muted)_22%)]"
            >
              <input
                type="radio"
                name={`q-${currentQuestion.id}`}
                value={option.id}
                checked={answers[currentQuestion.id] === option.id}
                onChange={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: option.id,
                  }))
                }
                className="mt-0.5 h-4 w-4 border-[var(--border)] text-[var(--foreground)] focus:ring-[color-mix(in_oklab,var(--foreground)_35%,transparent)]"
              />
              <span className="font-medium text-[var(--foreground)]">
                {option.optionText}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="cb-caption text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={currentIndex === 0 || submitting}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          className="cb-btn cb-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Terug
        </button>
        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            disabled={!currentAnswered || submitting}
            onClick={() =>
              setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))
            }
            className="cb-btn cb-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Verder
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="cb-btn cb-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Indienen..." : "Toets indienen"}
          </button>
        )}
        {!allAnswered && (
          <p className="self-center cb-caption">
            Beantwoord alle vragen om in te dienen.
          </p>
        )}
      </div>
    </form>
  );
}
