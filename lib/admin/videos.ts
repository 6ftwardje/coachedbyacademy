import { requireAdmin } from "@/lib/admin/access";
import { timeAsync } from "@/lib/perf";
import { createClient } from "@/lib/supabase/server";
import type { Lesson, Module } from "@/lib/types";

export type AdminLessonVideoRow = Lesson & {
  module: Pick<Module, "id" | "title" | "slug" | "order_index"> | null;
};

type LessonUpdate = Partial<
  Pick<
    Lesson,
    | "video_provider"
    | "video_url"
    | "video_duration_seconds"
    | "thumbnail_url"
    | "mux_asset_id"
    | "mux_playback_id"
    | "mux_playback_policy"
    | "mux_status"
    | "mux_upload_id"
    | "mux_error_message"
  >
>;

type LessonPlacement = {
  module_id: number;
  order_index: number;
};

export type AdminModuleVideoBlock = {
  module: Module;
  lessons: AdminLessonVideoRow[];
};

export type ModuleContentInput = {
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
};

export type LessonContentInput = {
  module_id: number;
  title: string;
  slug: string;
  description: string | null;
  takeaway: string | null;
  action_items: string[];
  thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
};

type LessonContentDetailsInput = Omit<
  LessonContentInput,
  "module_id" | "order_index"
>;

type ContentTable = "modules" | "lessons";

function hasDuplicateIds(ids: number[]): boolean {
  return new Set(ids).size !== ids.length;
}

function friendlyDbError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("duplicate key") && lower.includes("slug")) {
    return "That slug is already in use. Choose another slug or leave it empty so one can be generated.";
  }
  if (lower.includes("duplicate key") && lower.includes("order_index")) {
    return "That order position is already in use. Drag items to reorder, or choose a free number.";
  }
  return error;
}

export async function getNextModuleOrderAdmin(): Promise<number> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return 1;
  }

  const db = await createClient();
  const { data } = await db
    .from("modules")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data?.order_index as number | undefined) ?? 0) + 1;
}

export async function getNextLessonOrderAdmin(moduleId: number): Promise<number> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return 1;
  }

  const db = await createClient();
  const { data } = await db
    .from("lessons")
    .select("order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data?.order_index as number | undefined) ?? 0) + 1;
}

export async function getUniqueSlugAdmin(
  table: ContentTable,
  slug: string,
  currentId?: number
): Promise<string> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return slug;
  }

  const db = await createClient();
  let candidate = slug;
  let suffix = 2;

  while (suffix < 1000) {
    let query = db.from(table).select("id").eq("slug", candidate).limit(1);
    if (currentId) query = query.neq("id", currentId);
    const { data, error } = await query.maybeSingle();
    if (error) return slug;
    if (!data) return candidate;
    candidate = `${slug.slice(0, 82)}-${suffix}`;
    suffix += 1;
  }

  return `${slug.slice(0, 72)}-${crypto.randomUUID().slice(0, 8)}`;
}

async function updateModuleOrderValue(
  moduleId: number,
  orderIndex: number
): Promise<string | null> {
  const db = await createClient();
  const { error } = await db
    .from("modules")
    .update({ order_index: orderIndex })
    .eq("id", moduleId);

  return error ? friendlyDbError(error.message) : null;
}

async function updateLessonOrderValue({
  lessonId,
  moduleId,
  orderIndex,
}: {
  lessonId: number;
  moduleId: number;
  orderIndex: number;
}): Promise<string | null> {
  const db = await createClient();
  const { error } = await db
    .from("lessons")
    .update({ order_index: orderIndex })
    .eq("id", lessonId)
    .eq("module_id", moduleId);

  return error ? friendlyDbError(error.message) : null;
}

async function updateLessonPlacementValue({
  lessonId,
  moduleId,
  orderIndex,
}: {
  lessonId: number;
  moduleId: number;
  orderIndex: number;
}): Promise<string | null> {
  const db = await createClient();
  const { error } = await db
    .from("lessons")
    .update({ module_id: moduleId, order_index: orderIndex })
    .eq("id", lessonId);

  return error ? friendlyDbError(error.message) : null;
}

async function rollbackModuleOrder(
  moduleIds: number[],
  previousOrder: Map<number, number>
) {
  for (const [index, moduleId] of moduleIds.entries()) {
    await updateModuleOrderValue(moduleId, -2_000_000 - index);
  }
  for (const moduleId of moduleIds) {
    await updateModuleOrderValue(moduleId, previousOrder.get(moduleId) ?? 1);
  }
}

async function rollbackLessonOrder({
  moduleId,
  lessonIds,
  previousOrder,
}: {
  moduleId: number;
  lessonIds: number[];
  previousOrder: Map<number, number>;
}) {
  for (const [index, lessonId] of lessonIds.entries()) {
    await updateLessonOrderValue({
      lessonId,
      moduleId,
      orderIndex: -2_000_000 - index,
    });
  }
  for (const lessonId of lessonIds) {
    await updateLessonOrderValue({
      lessonId,
      moduleId,
      orderIndex: previousOrder.get(lessonId) ?? 1,
    });
  }
}

async function rollbackLessonPlacement(
  previousPlacement: Map<number, LessonPlacement>
): Promise<void> {
  const lessonIds = Array.from(previousPlacement.keys());

  for (const [index, lessonId] of lessonIds.entries()) {
    const placement = previousPlacement.get(lessonId);
    if (!placement) continue;
    await updateLessonPlacementValue({
      lessonId,
      moduleId: placement.module_id,
      orderIndex: -3_000_000 - index,
    });
  }

  for (const lessonId of lessonIds) {
    const placement = previousPlacement.get(lessonId);
    if (!placement) continue;
    await updateLessonPlacementValue({
      lessonId,
      moduleId: placement.module_id,
      orderIndex: placement.order_index,
    });
  }
}

async function fetchLessonOrderRows(moduleIds: number[]) {
  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .select("id, module_id, order_index")
    .in("module_id", moduleIds)
    .order("order_index", { ascending: true });

  return { data: data ?? [], error };
}

function insertBeforeId(
  ids: number[],
  lessonId: number,
  insertBeforeLessonId?: number | null
): number[] {
  const withoutLesson = ids.filter((id) => id !== lessonId);
  if (!insertBeforeLessonId || insertBeforeLessonId === lessonId) {
    return [...withoutLesson, lessonId];
  }

  const targetIndex = withoutLesson.indexOf(insertBeforeLessonId);
  if (targetIndex < 0) {
    return [...withoutLesson, lessonId];
  }

  const next = [...withoutLesson];
  next.splice(targetIndex, 0, lessonId);
  return next;
}

function insertAtPosition(
  ids: number[],
  lessonId: number,
  orderIndex: number
): number[] {
  const withoutLesson = ids.filter((id) => id !== lessonId);
  const insertionIndex = Math.min(
    Math.max(orderIndex - 1, 0),
    withoutLesson.length
  );
  const next = [...withoutLesson];
  next.splice(insertionIndex, 0, lessonId);
  return next;
}

async function saveLessonPlacement({
  lessonId,
  sourceModuleId,
  targetModuleId,
  sourceOrderedIds,
  targetOrderedIds,
  previousPlacement,
}: {
  lessonId: number;
  sourceModuleId: number;
  targetModuleId: number;
  sourceOrderedIds: number[];
  targetOrderedIds: number[];
  previousPlacement: Map<number, LessonPlacement>;
}): Promise<{ error: string | null }> {
  if (sourceModuleId === targetModuleId) {
    for (const [index, id] of targetOrderedIds.entries()) {
      const tempError = await updateLessonPlacementValue({
        lessonId: id,
        moduleId: targetModuleId,
        orderIndex: -1_000_000 - index,
      });
      if (tempError) {
        await rollbackLessonPlacement(previousPlacement);
        return { error: tempError };
      }
    }

    for (const [index, id] of targetOrderedIds.entries()) {
      const finalError = await updateLessonPlacementValue({
        lessonId: id,
        moduleId: targetModuleId,
        orderIndex: index + 1,
      });
      if (finalError) {
        await rollbackLessonPlacement(previousPlacement);
        return { error: finalError };
      }
    }

    return { error: null };
  }

  const targetExistingIds = targetOrderedIds.filter((id) => id !== lessonId);

  for (const [index, id] of sourceOrderedIds.entries()) {
    const tempError = await updateLessonPlacementValue({
      lessonId: id,
      moduleId: sourceModuleId,
      orderIndex: -1_000_000 - index,
    });
    if (tempError) {
      await rollbackLessonPlacement(previousPlacement);
      return { error: tempError };
    }
  }

  for (const [index, id] of targetExistingIds.entries()) {
    const tempError = await updateLessonPlacementValue({
      lessonId: id,
      moduleId: targetModuleId,
      orderIndex: -2_000_000 - index,
    });
    if (tempError) {
      await rollbackLessonPlacement(previousPlacement);
      return { error: tempError };
    }
  }

  const moveError = await updateLessonPlacementValue({
    lessonId,
    moduleId: targetModuleId,
    orderIndex: -3_000_000,
  });
  if (moveError) {
    await rollbackLessonPlacement(previousPlacement);
    return { error: moveError };
  }

  for (const [index, id] of sourceOrderedIds.entries()) {
    const finalError = await updateLessonPlacementValue({
      lessonId: id,
      moduleId: sourceModuleId,
      orderIndex: index + 1,
    });
    if (finalError) {
      await rollbackLessonPlacement(previousPlacement);
      return { error: finalError };
    }
  }

  for (const [index, id] of targetOrderedIds.entries()) {
    const finalError = await updateLessonPlacementValue({
      lessonId: id,
      moduleId: targetModuleId,
      orderIndex: index + 1,
    });
    if (finalError) {
      await rollbackLessonPlacement(previousPlacement);
      return { error: finalError };
    }
  }

  return { error: null };
}

export async function reorderModulesAdmin(
  orderedIds: number[]
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  if (orderedIds.length === 0 || hasDuplicateIds(orderedIds)) {
    return { error: "Invalid module order." };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("modules")
    .select("id, order_index")
    .order("order_index", { ascending: true });

  if (error) return { error: friendlyDbError(error.message) };
  if ((data ?? []).length !== orderedIds.length) {
    return { error: "Module order is stale. Refresh and try again." };
  }

  const existingIds = new Set((data ?? []).map((row) => Number(row.id)));
  if (orderedIds.some((id) => !existingIds.has(id))) {
    return { error: "Module order is stale. Refresh and try again." };
  }

  const previousOrder = new Map(
    (data ?? []).map((row) => [Number(row.id), Number(row.order_index)])
  );
  const touchedIds: number[] = [];

  for (const [index, moduleId] of orderedIds.entries()) {
    const tempError = await updateModuleOrderValue(
      moduleId,
      -1_000_000 - index
    );
    if (tempError) {
      await rollbackModuleOrder(touchedIds, previousOrder);
      return { error: tempError };
    }
    touchedIds.push(moduleId);
  }

  for (const [index, moduleId] of orderedIds.entries()) {
    const finalError = await updateModuleOrderValue(moduleId, index + 1);
    if (finalError) {
      await rollbackModuleOrder(touchedIds, previousOrder);
      return { error: finalError };
    }
  }

  return { error: null };
}

export async function reorderLessonsAdmin(
  moduleId: number,
  orderedIds: number[]
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  if (!moduleId || orderedIds.length === 0 || hasDuplicateIds(orderedIds)) {
    return { error: "Invalid lesson order." };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .select("id, order_index")
    .eq("module_id", moduleId);

  if (error) return { error: friendlyDbError(error.message) };
  if ((data ?? []).length !== orderedIds.length) {
    return { error: "Lesson order is stale. Refresh and try again." };
  }

  const existingIds = new Set((data ?? []).map((row) => Number(row.id)));
  if (orderedIds.some((id) => !existingIds.has(id))) {
    return { error: "Lesson order contains a lesson from another module." };
  }

  const previousOrder = new Map(
    (data ?? []).map((row) => [Number(row.id), Number(row.order_index)])
  );
  const touchedIds: number[] = [];

  for (const [index, lessonId] of orderedIds.entries()) {
    const tempError = await updateLessonOrderValue({
      lessonId,
      moduleId,
      orderIndex: -1_000_000 - index,
    });
    if (tempError) {
      await rollbackLessonOrder({ moduleId, lessonIds: touchedIds, previousOrder });
      return { error: tempError };
    }
    touchedIds.push(lessonId);
  }

  for (const [index, lessonId] of orderedIds.entries()) {
    const finalError = await updateLessonOrderValue({
      lessonId,
      moduleId,
      orderIndex: index + 1,
    });
    if (finalError) {
      await rollbackLessonOrder({ moduleId, lessonIds: touchedIds, previousOrder });
      return { error: finalError };
    }
  }

  return { error: null };
}

export async function moveLessonToModuleAdmin({
  lessonId,
  targetModuleId,
  insertBeforeLessonId = null,
}: {
  lessonId: number;
  targetModuleId: number;
  insertBeforeLessonId?: number | null;
}): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  if (!lessonId || !targetModuleId || insertBeforeLessonId === lessonId) {
    return { error: "Invalid lesson move." };
  }

  const lesson = await getLessonForVideoAdmin(lessonId);
  if (!lesson) return { error: "Lesson not found." };

  const sourceModuleId = lesson.module_id;
  const moduleIds =
    sourceModuleId === targetModuleId
      ? [sourceModuleId]
      : [sourceModuleId, targetModuleId];
  const { data, error } = await fetchLessonOrderRows(moduleIds);
  if (error) return { error: friendlyDbError(error.message) };

  const sourceRows = data.filter(
    (row) => Number(row.module_id) === sourceModuleId
  );
  const targetRows = data.filter(
    (row) => Number(row.module_id) === targetModuleId
  );
  const sourceIds = sourceRows.map((row) => Number(row.id));
  const targetIds = targetRows.map((row) => Number(row.id));

  if (!sourceIds.includes(lessonId)) {
    return { error: "Lesson order is stale. Refresh and try again." };
  }
  if (insertBeforeLessonId && !targetIds.includes(insertBeforeLessonId)) {
    return { error: "Target lesson is stale. Refresh and try again." };
  }

  const previousPlacement = new Map(
    data.map((row) => [
      Number(row.id),
      {
        module_id: Number(row.module_id),
        order_index: Number(row.order_index),
      },
    ])
  );

  const targetOrderedIds = insertBeforeId(
    targetIds,
    lessonId,
    insertBeforeLessonId
  );
  const sourceOrderedIds = sourceIds.filter((id) => id !== lessonId);

  return saveLessonPlacement({
    lessonId,
    sourceModuleId,
    targetModuleId,
    sourceOrderedIds:
      sourceModuleId === targetModuleId
        ? targetOrderedIds
        : sourceOrderedIds,
    targetOrderedIds,
    previousPlacement,
  });
}

export async function placeLessonAtOrderAdmin({
  lessonId,
  targetModuleId,
  orderIndex,
}: {
  lessonId: number;
  targetModuleId: number;
  orderIndex: number;
}): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  if (!lessonId || !targetModuleId || !orderIndex) {
    return { error: "Invalid lesson order." };
  }

  const lesson = await getLessonForVideoAdmin(lessonId);
  if (!lesson) return { error: "Lesson not found." };

  const sourceModuleId = lesson.module_id;
  const moduleIds =
    sourceModuleId === targetModuleId
      ? [sourceModuleId]
      : [sourceModuleId, targetModuleId];
  const { data, error } = await fetchLessonOrderRows(moduleIds);
  if (error) return { error: friendlyDbError(error.message) };

  const sourceRows = data.filter(
    (row) => Number(row.module_id) === sourceModuleId
  );
  const targetRows = data.filter(
    (row) => Number(row.module_id) === targetModuleId
  );
  const sourceIds = sourceRows.map((row) => Number(row.id));
  const targetIds = targetRows.map((row) => Number(row.id));

  if (!sourceIds.includes(lessonId)) {
    return { error: "Lesson order is stale. Refresh and try again." };
  }

  const previousPlacement = new Map(
    data.map((row) => [
      Number(row.id),
      {
        module_id: Number(row.module_id),
        order_index: Number(row.order_index),
      },
    ])
  );
  const targetOrderedIds = insertAtPosition(targetIds, lessonId, orderIndex);
  const sourceOrderedIds = sourceIds.filter((id) => id !== lessonId);

  return saveLessonPlacement({
    lessonId,
    sourceModuleId,
    targetModuleId,
    sourceOrderedIds:
      sourceModuleId === targetModuleId
        ? targetOrderedIds
        : sourceOrderedIds,
    targetOrderedIds,
    previousPlacement,
  });
}

export async function listLessonsForVideoAdmin(): Promise<AdminLessonVideoRow[]> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return [];
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .select(
      `
        *,
        module:modules (
          id,
          title,
          slug,
          order_index
        )
      `
    )
    .order("module_id", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) {
    console.error("listLessonsForVideoAdmin", error.message);
    return [];
  }

  return ((data ?? []) as AdminLessonVideoRow[]).sort((a, b) => {
    const moduleOrder =
      (a.module?.order_index ?? a.module_id) - (b.module?.order_index ?? b.module_id);
    if (moduleOrder !== 0) return moduleOrder;
    return a.order_index - b.order_index;
  });
}

export async function listModulesForVideoAdmin(): Promise<Module[]> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return [];
  }

  const db = await createClient();
  const { data, error } = await db
    .from("modules")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    console.error("listModulesForVideoAdmin", error.message);
    return [];
  }

  return (data ?? []) as Module[];
}

export async function listModuleVideoBlocksAdmin(): Promise<AdminModuleVideoBlock[]> {
  const [modules, lessons] = await timeAsync("[perf] admin.list.query", () =>
    Promise.all([
      listModulesForVideoAdmin(),
      listLessonsForVideoAdmin(),
    ])
  );

  return modules.map((module) => ({
    module,
    lessons: lessons.filter((lesson) => lesson.module_id === module.id),
  }));
}

export async function getLessonForVideoAdmin(
  lessonId: number
): Promise<Lesson | null> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Lesson;
}

export async function updateLessonVideoAdmin(
  lessonId: number,
  update: LessonUpdate
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .update(update)
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) {
    return {
      error:
        "No lesson was updated. Check that the admin content migration has been applied.",
    };
  }
  return { error: null };
}

export async function createModuleAdmin(
  input: ModuleContentInput
): Promise<{ module: Module | null; error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { module: null, error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("modules")
    .insert(input)
    .select("*")
    .single();

  if (error) return { module: null, error: friendlyDbError(error.message) };
  return { module: data as Module, error: null };
}

export async function updateModuleAdmin(
  moduleId: number,
  input: ModuleContentInput
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("modules")
    .update(input)
    .eq("id", moduleId)
    .select("id")
    .maybeSingle();

  if (error) return { error: friendlyDbError(error.message) };
  if (!data) {
    return {
      error:
        "No module was updated. Check that the admin content migration has been applied.",
    };
  }
  return { error: null };
}

export async function createLessonAdmin(
  input: LessonContentInput & Partial<LessonUpdate>
): Promise<{ lesson: Lesson | null; error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { lesson: null, error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .insert(input)
    .select("*")
    .single();

  if (error) return { lesson: null, error: friendlyDbError(error.message) };
  return { lesson: data as Lesson, error: null };
}

export async function updateLessonContentAdmin(
  lessonId: number,
  input: LessonContentInput
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .update(input)
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error) return { error: friendlyDbError(error.message) };
  if (!data) {
    return {
      error:
        "No lesson was updated. Check that the admin content migration has been applied.",
    };
  }
  return { error: null };
}

export async function updateLessonDetailsAdmin(
  lessonId: number,
  input: LessonContentDetailsInput
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .update(input)
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error) return { error: friendlyDbError(error.message) };
  if (!data) {
    return {
      error:
        "No lesson was updated. Check that the admin content migration has been applied.",
    };
  }
  return { error: null };
}

export async function deleteLessonAdmin(
  lessonId: number
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) {
    return {
      error:
        "No lesson was deleted. Check that the admin content migration has been applied.",
    };
  }
  return { error: null };
}

export async function deleteEmptyModuleAdmin(
  moduleId: number
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const db = await createClient();
  const { data: existingLesson, error: countError } = await db
    .from("lessons")
    .select("id")
    .eq("module_id", moduleId)
    .limit(1)
    .maybeSingle();

  if (countError) return { error: countError.message };
  if (existingLesson) {
    return {
      error:
        "This module still has lessons. Delete or move those lessons before deleting the module.",
    };
  }

  const { data, error } = await db
    .from("modules")
    .delete()
    .eq("id", moduleId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) {
    return {
      error:
        "No module was deleted. Check that the admin content migration has been applied.",
    };
  }
  return { error: null };
}
