"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminArchiveExamQuestion,
  adminSaveExamQuestion,
  adminSetExamQuestionActive,
} from "@/app/actions/admin/exams";
import type {
  AdminExamModuleSummary,
  AdminExamQuestion,
} from "@/lib/admin/exam-questions";

type DraftOption = {
  id?: number | null;
  optionText: string;
  isCorrect: boolean;
};

type DraftQuestion = {
  questionId?: number | null;
  moduleId: number;
  questionText: string;
  explanation: string;
  isActive: boolean;
  options: DraftOption[];
};

function emptyDraft(moduleId: number): DraftQuestion {
  return {
    questionId: null,
    moduleId,
    questionText: "",
    explanation: "",
    isActive: true,
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
    ],
  };
}

function draftFromQuestion(question: AdminExamQuestion): DraftQuestion {
  return {
    questionId: question.id,
    moduleId: question.module_id,
    questionText: question.question_text,
    explanation: question.explanation ?? "",
    isActive: question.is_active,
    options: question.options.map((option) => ({
      id: option.id,
      optionText: option.option_text,
      isCorrect: option.is_correct,
    })),
  };
}

function fieldClass() {
  return "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[color-mix(in_oklab,var(--foreground)_35%,var(--border))]";
}

function iconButtonClass(tone: "normal" | "danger" = "normal") {
  return `inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
    tone === "danger"
      ? "border-red-500/20 text-red-700 hover:bg-red-500/10 dark:text-red-300"
      : "border-[var(--border)] text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--card)_70%,var(--foreground)_6%)] hover:text-[var(--foreground)]"
  }`;
}

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: "plus" | "edit" | "archive" | "search" | "trash";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  };

  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="m4 16.8-.7 3.9 3.9-.7L18.9 8.3 15.7 5.1 4 16.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m14.6 6.2 3.2 3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "archive") {
    return (
      <svg {...common}>
        <path d="M4 7h16l-1 13H5L4 7Zm2-3h12l2 3H4l2-3Zm4 8h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <path d="m20 20-4.2-4.2M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M5 7h14M9 7V5h6v2m-8 0 .8 13h8.4L17 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AdminExamManager({
  modules,
}: {
  modules: AdminExamModuleSummary[];
}) {
  const router = useRouter();
  const [selectedModuleId, setSelectedModuleId] = useState(
    modules[0]?.module.id ?? 0
  );
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<DraftQuestion | null>(
    modules[0] ? emptyDraft(modules[0].module.id) : null
  );
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModule =
    modules.find((module) => module.module.id === selectedModuleId) ?? modules[0];

  const filteredQuestions = useMemo(() => {
    if (!selectedModule) return [];
    const query = search.trim().toLowerCase();
    if (!query) return selectedModule.questions;
    return selectedModule.questions.filter((question) => {
      const haystack = `${question.question_text} ${question.explanation ?? ""}`
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, selectedModule]);

  function selectModule(moduleId: number) {
    setSelectedModuleId(moduleId);
    setSearch("");
    setDraft(emptyDraft(moduleId));
    setStatus(null);
  }

  function updateDraft(patch: Partial<DraftQuestion>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function saveDraft() {
    if (!draft) return;
    setStatus(null);
    startTransition(async () => {
      const result = await adminSaveExamQuestion({
        questionId: draft.questionId,
        moduleId: draft.moduleId,
        questionText: draft.questionText,
        explanation: draft.explanation,
        isActive: draft.isActive,
        options: draft.options,
      });
      if (!result.success) {
        setStatus(result.error ?? "Opslaan mislukt.");
        return;
      }
      setStatus("Vraag opgeslagen.");
      setDraft(emptyDraft(draft.moduleId));
      router.refresh();
    });
  }

  function setQuestionActive(question: AdminExamQuestion, isActive: boolean) {
    setStatus(null);
    startTransition(async () => {
      const result = await adminSetExamQuestionActive(question.id, isActive);
      if (!result.success) {
        setStatus(result.error ?? "Wijzigen mislukt.");
        return;
      }
      router.refresh();
    });
  }

  function archiveQuestion(question: AdminExamQuestion) {
    setStatus(null);
    startTransition(async () => {
      const result = await adminArchiveExamQuestion(question.id);
      if (!result.success) {
        setStatus(result.error ?? "Archiveren mislukt.");
        return;
      }
      if (draft?.questionId === question.id) setDraft(emptyDraft(question.module_id));
      router.refresh();
    });
  }

  if (!selectedModule || !draft) {
    return (
      <div className="cb-panel p-8">
        <p className="cb-caption">Er zijn nog geen modules beschikbaar.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3">
        {modules.map((moduleSummary) => {
          const active = moduleSummary.module.id === selectedModule.module.id;
          const ready = moduleSummary.validActiveQuestionCount >= 10;
          return (
            <button
              key={moduleSummary.module.id}
              type="button"
              onClick={() => selectModule(moduleSummary.module.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                active
                  ? "border-[var(--foreground)] bg-[var(--card)]"
                  : "border-[var(--border)] bg-transparent hover:bg-[var(--card)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {moduleSummary.module.order_index}. {moduleSummary.module.title}
                </span>
                <span
                  className={
                    ready ? "cb-badge cb-badge-completed" : "cb-badge cb-badge-locked"
                  }
                >
                  {moduleSummary.validActiveQuestionCount}/10
                </span>
              </div>
              <p className="cb-caption mt-2">
                {moduleSummary.activeQuestionCount} actief,{" "}
                {moduleSummary.totalQuestionCount} totaal
              </p>
            </button>
          );
        })}
      </aside>

      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Actieve vragen" value={selectedModule.activeQuestionCount} />
          <Metric
            label="Geldig voor examen"
            value={`${selectedModule.validActiveQuestionCount}/10`}
            warning={selectedModule.validActiveQuestionCount < 10}
          />
          <Metric label="Totaal" value={selectedModule.totalQuestionCount} />
        </section>

        {selectedModule.validActiveQuestionCount < 10 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-[var(--foreground)]">
            Deze module heeft minder dan 10 geldige actieve vragen. Studenten kunnen
            de toets pas starten wanneer dit aangevuld is.
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="cb-panel p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="cb-h2">Vragenlijst</h2>
              <label className="relative block sm:w-72">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Zoek vraag"
                  className={`${fieldClass()} pl-9`}
                />
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {filteredQuestions.map((question) => (
                <article
                  key={question.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        {question.isValidActive ? (
                          <span className="cb-badge cb-badge-completed">Geldig</span>
                        ) : (
                          <span className="cb-badge cb-badge-locked">Check nodig</span>
                        )}
                        {!question.is_active && (
                          <span className="cb-badge cb-badge-locked">Inactief</span>
                        )}
                        {question.usedInAttemptCount > 0 && (
                          <span className="cb-badge cb-badge-available">
                            {question.usedInAttemptCount} pogingen
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-sm font-bold leading-snug text-[var(--foreground)]">
                        {question.question_text}
                      </h3>
                      <p className="cb-caption mt-2">
                        {question.options.length} opties,{" "}
                        {question.options.filter((option) => option.is_correct).length} correct
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className={iconButtonClass()}
                        title="Bewerken"
                        onClick={() => setDraft(draftFromQuestion(question))}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        className={iconButtonClass()}
                        title={question.is_active ? "Deactiveren" : "Activeren"}
                        onClick={() => setQuestionActive(question, !question.is_active)}
                        disabled={isPending}
                      >
                        <Icon name="plus" />
                      </button>
                      <button
                        type="button"
                        className={iconButtonClass("danger")}
                        title="Archiveren"
                        onClick={() => archiveQuestion(question)}
                        disabled={isPending}
                      >
                        <Icon name="archive" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {filteredQuestions.length === 0 && (
                <p className="cb-caption rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
                  Geen vragen gevonden.
                </p>
              )}
            </div>
          </section>

          <QuestionEditor
            draft={draft}
            isPending={isPending}
            status={status}
            onDraftChange={updateDraft}
            onSave={saveDraft}
            onNew={() => setDraft(emptyDraft(selectedModule.module.id))}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number | string;
  warning?: boolean;
}) {
  return (
    <div className="cb-panel p-4">
      <div className="cb-eyebrow">{label}</div>
      <div
        className={`mt-2 text-2xl font-bold ${
          warning ? "text-amber-700 dark:text-amber-300" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function QuestionEditor({
  draft,
  isPending,
  status,
  onDraftChange,
  onSave,
  onNew,
}: {
  draft: DraftQuestion;
  isPending: boolean;
  status: string | null;
  onDraftChange: (patch: Partial<DraftQuestion>) => void;
  onSave: () => void;
  onNew: () => void;
}) {
  function updateOption(index: number, patch: Partial<DraftOption>) {
    onDraftChange({
      options: draft.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option
      ),
    });
  }

  function setCorrectOption(index: number) {
    onDraftChange({
      options: draft.options.map((option, optionIndex) => ({
        ...option,
        isCorrect: optionIndex === index,
      })),
    });
  }

  function removeOption(index: number) {
    if (draft.options.length <= 2) return;
    const nextOptions = draft.options.filter((_, optionIndex) => optionIndex !== index);
    if (!nextOptions.some((option) => option.isCorrect)) {
      nextOptions[0] = { ...nextOptions[0], isCorrect: true };
    }
    onDraftChange({ options: nextOptions });
  }

  return (
    <section className="cb-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="cb-eyebrow">Editor</div>
          <h2 className="cb-h2 mt-1">
            {draft.questionId ? "Vraag bewerken" : "Nieuwe vraag"}
          </h2>
        </div>
        <button type="button" onClick={onNew} className="cb-btn cb-btn-secondary">
          Nieuw
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Vraag
          </span>
          <textarea
            value={draft.questionText}
            onChange={(event) => onDraftChange({ questionText: event.target.value })}
            rows={4}
            className={fieldClass()}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Uitleg
          </span>
          <textarea
            value={draft.explanation}
            onChange={(event) => onDraftChange({ explanation: event.target.value })}
            rows={3}
            className={fieldClass()}
          />
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2.5">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => onDraftChange({ isActive: event.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Actief
          </span>
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Antwoordopties
            </span>
            <button
              type="button"
              onClick={() =>
                onDraftChange({
                  options: [...draft.options, { optionText: "", isCorrect: false }],
                })
              }
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--foreground)]"
            >
              <Icon name="plus" />
              Optie
            </button>
          </div>

          {draft.options.map((option, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-[var(--border)] p-3">
              <div className="flex gap-2">
                <input
                  value={option.optionText}
                  onChange={(event) =>
                    updateOption(index, { optionText: event.target.value })
                  }
                  placeholder={`Optie ${index + 1}`}
                  className={fieldClass()}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={draft.options.length <= 2}
                  className={iconButtonClass("danger")}
                  title="Optie verwijderen"
                >
                  <Icon name="trash" />
                </button>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <input
                  type="radio"
                  name="correct-option"
                  checked={option.isCorrect}
                  onChange={() => setCorrectOption(index)}
                  className="h-4 w-4"
                />
                Correct antwoord
              </label>
            </div>
          ))}
        </div>

        {status && (
          <p className="cb-caption" role="status">
            {status}
          </p>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="cb-btn cb-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Opslaan..." : "Vraag opslaan"}
        </button>
      </div>
    </section>
  );
}
