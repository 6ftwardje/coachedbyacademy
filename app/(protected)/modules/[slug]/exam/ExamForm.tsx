"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitExam } from "@/app/actions/exam";
import type { ExamQuestion } from "@/lib/types";

type Props = {
  examId: number;
  questions: ExamQuestion[];
  passingScore: number;
  moduleSlug: string;
  moduleTitle: string;
};

export function ExamForm({
  examId,
  questions,
  passingScore,
  moduleSlug,
  moduleTitle,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = questions.every((q) => answers[q.id]?.trim() !== "");
  const canSubmit = allAnswered && !submitting && !result;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const answersList = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id] ?? "",
    }));

    submitExam(examId, answersList).then((res) => {
      setSubmitting(false);
      if (res.success && res.score != null && res.passed != null) {
        setResult({ score: res.score, passed: res.passed });
        router.refresh();
      } else {
        setError(res.error ?? "Submission failed");
      }
    });
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Result</h2>
        <p className="mt-2 text-2xl font-semibold text-stone-900">
          Score: {result.score}%
        </p>
        <p className="mt-1">
          {result.passed ? (
            <span className="inline-flex items-center rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              Passed
            </span>
          ) : (
            <span className="inline-flex items-center rounded-lg bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              Not passed (need {passingScore}%)
            </span>
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/modules/${moduleSlug}`}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Back to module
          </Link>
          {result.passed && (
            <Link
              href="/modules"
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Continue to next module →
            </Link>
          )}
          {!result.passed && (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Retake exam
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        {questions.map((q, index) => (
          <fieldset
            key={q.id}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <legend className="text-sm font-medium text-stone-500">
              Question {index + 1} of {questions.length}
            </legend>
            <p className="mt-2 font-medium text-stone-900">{q.question}</p>
            <div className="mt-4 space-y-2">
              {q.options.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 hover:bg-stone-50 has-[:checked]:border-stone-400 has-[:checked]:bg-stone-50"
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={option}
                    checked={answers[q.id] === option}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: option }))
                    }
                    className="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-500"
                  />
                  <span className="text-stone-700">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit exam"}
        </button>
        {!allAnswered && (
          <p className="self-center text-sm text-stone-500">
            Answer all questions to submit.
          </p>
        )}
      </div>
    </form>
  );
}
