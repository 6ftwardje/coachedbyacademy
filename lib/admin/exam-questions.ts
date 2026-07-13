import { createClient } from "@/lib/supabase/server";
import type { Module } from "@/lib/types";

export type AdminExamAnswerOption = {
  id: number;
  option_text: string;
  is_correct: boolean;
  order_index: number;
};

export type AdminExamQuestion = {
  id: number;
  exam_id: number;
  module_id: number;
  question_text: string;
  explanation: string | null;
  is_active: boolean;
  deleted_at: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  options: AdminExamAnswerOption[];
  usedInAttemptCount: number;
  isValidActive: boolean;
};

export type AdminExamModuleSummary = {
  module: Module;
  exam: {
    id: number;
    title: string;
    passing_score: number;
    is_published: boolean;
  } | null;
  activeQuestionCount: number;
  validActiveQuestionCount: number;
  totalQuestionCount: number;
  questions: AdminExamQuestion[];
};

const MODULE_SELECT =
  "id, title, slug, description, short_description, order_index, thumbnail_url, icon_url, is_published, created_at, updated_at";

export async function listAdminExamModules(): Promise<AdminExamModuleSummary[]> {
  const db = await createClient();
  const { data: modules, error: moduleError } = await db
    .from("modules")
    .select(MODULE_SELECT)
    .order("order_index", { ascending: true });

  if (moduleError || !modules?.length) return [];

  const moduleRows = modules as Module[];
  const moduleIds = moduleRows.map((module) => module.id);

  const [{ data: exams }, { data: questions }] = await Promise.all([
    db
      .from("exams")
      .select("id, module_id, title, passing_score, is_published")
      .in("module_id", moduleIds),
    db
      .from("exam_questions")
      .select(
        "id, exam_id, module_id, question_text, explanation, is_active, deleted_at, order_index, created_at, updated_at"
      )
      .in("module_id", moduleIds)
      .is("deleted_at", null)
      .order("order_index", { ascending: true }),
  ]);

  const questionRows = (questions ?? []) as Omit<
    AdminExamQuestion,
    "options" | "usedInAttemptCount" | "isValidActive"
  >[];
  const questionIds = questionRows.map((question) => question.id);

  const [{ data: options }, { data: usageRows }] =
    questionIds.length > 0
      ? await Promise.all([
          db
            .from("exam_answer_options")
            .select("id, question_id, option_text, is_correct, order_index")
            .in("question_id", questionIds)
            .order("order_index", { ascending: true }),
          db
            .from("exam_attempt_questions")
            .select("question_id")
            .in("question_id", questionIds),
        ])
      : [{ data: [] }, { data: [] }];

  const optionsByQuestion = new Map<number, AdminExamAnswerOption[]>();
  for (const option of options ?? []) {
    const row = option as AdminExamAnswerOption & { question_id: number };
    const list = optionsByQuestion.get(row.question_id) ?? [];
    list.push({
      id: row.id,
      option_text: row.option_text,
      is_correct: row.is_correct,
      order_index: row.order_index,
    });
    optionsByQuestion.set(row.question_id, list);
  }

  const usageCountByQuestion = new Map<number, number>();
  for (const usage of usageRows ?? []) {
    const questionId = Number((usage as { question_id: number }).question_id);
    usageCountByQuestion.set(questionId, (usageCountByQuestion.get(questionId) ?? 0) + 1);
  }

  const questionsByModule = new Map<number, AdminExamQuestion[]>();
  for (const question of questionRows) {
    const questionOptions = optionsByQuestion.get(question.id) ?? [];
    const correctCount = questionOptions.filter((option) => option.is_correct).length;
    const enriched: AdminExamQuestion = {
      ...question,
      options: questionOptions,
      usedInAttemptCount: usageCountByQuestion.get(question.id) ?? 0,
      isValidActive:
        question.is_active &&
        !question.deleted_at &&
        questionOptions.length >= 2 &&
        correctCount === 1,
    };
    const list = questionsByModule.get(question.module_id) ?? [];
    list.push(enriched);
    questionsByModule.set(question.module_id, list);
  }

  const examByModule = new Map<
    number,
    { id: number; title: string; passing_score: number; is_published: boolean }
  >();
  for (const exam of exams ?? []) {
    const row = exam as {
      id: number;
      module_id: number;
      title: string;
      passing_score: number;
      is_published: boolean;
    };
    examByModule.set(row.module_id, row);
  }

  return moduleRows.map((module) => {
    const moduleQuestions = questionsByModule.get(module.id) ?? [];
    const activeQuestionCount = moduleQuestions.filter(
      (question) => question.is_active && !question.deleted_at
    ).length;

    return {
      module,
      exam: examByModule.get(module.id) ?? null,
      activeQuestionCount,
      validActiveQuestionCount: moduleQuestions.filter((question) => question.isValidActive).length,
      totalQuestionCount: moduleQuestions.length,
      questions: moduleQuestions,
    };
  });
}

export type SaveExamQuestionInput = {
  questionId?: number | null;
  moduleId: number;
  questionText: string;
  explanation?: string | null;
  isActive: boolean;
  options: { id?: number | null; optionText: string; isCorrect: boolean }[];
};

export function validateExamQuestionInput(
  input: SaveExamQuestionInput
): string | null {
  if (!Number.isInteger(input.moduleId) || input.moduleId <= 0) {
    return "Kies een module.";
  }
  if (!input.questionText.trim()) {
    return "Vraagtekst is verplicht.";
  }
  if (input.options.length < 2) {
    return "Voeg minstens twee antwoordopties toe.";
  }
  if (input.options.some((option) => !option.optionText.trim())) {
    return "Antwoordopties mogen niet leeg zijn.";
  }
  if (input.options.filter((option) => option.isCorrect).length !== 1) {
    return "Markeer exact een correct antwoord.";
  }
  return null;
}

export async function saveExamQuestionAdmin(
  input: SaveExamQuestionInput,
  actorStudentId: string
): Promise<{ questionId?: number; error?: string }> {
  const validationError = validateExamQuestionInput(input);
  if (validationError) return { error: validationError };

  const db = await createClient();
  const examResult = await ensureExamForModule(input.moduleId);
  if (examResult.error || !examResult.examId) {
    return { error: examResult.error ?? "Kon de toets niet aanmaken." };
  }

  const normalized = normalizeQuestionInput(input);
  let targetQuestionId = input.questionId ?? null;

  if (targetQuestionId) {
    const { data: existing, error: existingError } = await db
      .from("exam_questions")
      .select("id, module_id, exam_id")
      .eq("id", targetQuestionId)
      .maybeSingle();

    if (existingError || !existing) return { error: "Vraag niet gevonden." };
    const existingRow = existing as { id: number; module_id: number; exam_id: number };
    if (existingRow.module_id !== input.moduleId) {
      return { error: "Deze vraag hoort niet bij de gekozen module." };
    }

    const { count } = await db
      .from("exam_attempt_questions")
      .select("id", { count: "exact", head: true })
      .eq("question_id", targetQuestionId);

    if ((count ?? 0) > 0) {
      await db
        .from("exam_questions")
        .update({ is_active: false, updated_by: actorStudentId })
        .eq("id", targetQuestionId);
      targetQuestionId = null;
    }
  }

  if (!targetQuestionId) {
    const orderIndex = await getNextQuestionOrder(input.moduleId);
    const { data: inserted, error: insertError } = await db
      .from("exam_questions")
      .insert({
        exam_id: examResult.examId,
        module_id: input.moduleId,
        question: normalized.questionText,
        question_text: normalized.questionText,
        explanation: normalized.explanation,
        options: normalized.legacyOptions,
        correct_answer: normalized.correctAnswer,
        order_index: orderIndex,
        is_active: input.isActive,
        created_by: actorStudentId,
        updated_by: actorStudentId,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { error: insertError?.message ?? "Vraag opslaan mislukt." };
    }
    targetQuestionId = Number((inserted as { id: number }).id);
  } else {
    const { error: updateError } = await db
      .from("exam_questions")
      .update({
        question: normalized.questionText,
        question_text: normalized.questionText,
        explanation: normalized.explanation,
        options: normalized.legacyOptions,
        correct_answer: normalized.correctAnswer,
        is_active: input.isActive,
        updated_by: actorStudentId,
      })
      .eq("id", targetQuestionId);

    if (updateError) return { error: updateError.message };

    const { error: deleteError } = await db
      .from("exam_answer_options")
      .delete()
      .eq("question_id", targetQuestionId);

    if (deleteError) return { error: deleteError.message };
  }

  const { error: optionError } = await db.from("exam_answer_options").insert(
    normalized.options.map((option, index) => ({
      question_id: targetQuestionId,
      option_text: option.optionText,
      is_correct: option.isCorrect,
      order_index: index,
    }))
  );

  if (optionError) return { error: optionError.message };
  return { questionId: targetQuestionId };
}

export async function setExamQuestionActiveAdmin(
  questionId: number,
  isActive: boolean,
  actorStudentId: string
): Promise<{ error?: string }> {
  const db = await createClient();
  const { error } = await db
    .from("exam_questions")
    .update({ is_active: isActive, updated_by: actorStudentId })
    .eq("id", questionId)
    .is("deleted_at", null);

  return { error: error?.message };
}

export async function archiveExamQuestionAdmin(
  questionId: number,
  actorStudentId: string
): Promise<{ error?: string }> {
  const db = await createClient();
  const { error } = await db
    .from("exam_questions")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_by: actorStudentId,
    })
    .eq("id", questionId);

  return { error: error?.message };
}

async function ensureExamForModule(
  moduleId: number
): Promise<{ examId?: number; error?: string }> {
  const db = await createClient();
  const { data: existing, error: existingError } = await db
    .from("exams")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (existing) return { examId: Number((existing as { id: number }).id) };

  const { data: moduleRow, error: moduleError } = await db
    .from("modules")
    .select("title")
    .eq("id", moduleId)
    .single();

  if (moduleError || !moduleRow) return { error: "Module niet gevonden." };

  const { data: inserted, error: insertError } = await db
    .from("exams")
    .insert({
      module_id: moduleId,
      title: `${(moduleRow as { title: string }).title} toets`,
      description: "Beantwoord 10 willekeurige vragen om deze module af te ronden.",
      passing_score: 70,
      is_published: true,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Kon de toets niet aanmaken." };
  }
  return { examId: Number((inserted as { id: number }).id) };
}

async function getNextQuestionOrder(moduleId: number): Promise<number> {
  const db = await createClient();
  const { data } = await db
    .from("exam_questions")
    .select("order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Number((data as { order_index?: number } | null)?.order_index ?? 0) + 1;
}

function normalizeQuestionInput(input: SaveExamQuestionInput) {
  const options = input.options.map((option) => ({
    optionText: option.optionText.trim(),
    isCorrect: option.isCorrect,
  }));
  const correctAnswer =
    options.find((option) => option.isCorrect)?.optionText ?? options[0]?.optionText ?? "";

  return {
    questionText: input.questionText.trim(),
    explanation: input.explanation?.trim() || null,
    options,
    legacyOptions: options.map((option) => option.optionText),
    correctAnswer,
  };
}
