import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/lib/types";

const LESSON_DETAIL_SELECT =
  "id, module_id, title, slug, description, takeaway, action_items, video_url, video_provider, video_duration_seconds, thumbnail_url, mux_asset_id, mux_playback_id, mux_playback_policy, mux_status, mux_upload_id, mux_error_message, order_index, is_published, created_at, updated_at";

const LESSON_LIST_SELECT =
  "id, module_id, title, slug, description, thumbnail_url, order_index, is_published";

export async function getLessonBySlug(slug: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Lesson;
}

export async function getLessonById(lessonId: number): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_DETAIL_SELECT)
    .eq("id", lessonId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Lesson;
}

export async function getPublishedLessonsByModuleId(
  moduleId: number
): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_LIST_SELECT)
    .eq("module_id", moduleId)
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  if (error) return [];
  return (data ?? []) as Lesson[];
}

export async function getLessonCountByModuleId(
  moduleId: number
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("module_id", moduleId)
    .eq("is_published", true);

  if (error) return 0;
  return count ?? 0;
}

export async function getLessonCountsByModuleIds(
  moduleIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map(moduleIds.map((id) => [id, 0]));
  if (moduleIds.length === 0) return counts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("module_id")
    .in("module_id", moduleIds)
    .eq("is_published", true);

  if (error) return counts;

  for (const row of data ?? []) {
    const lesson = row as { module_id: number };
    counts.set(lesson.module_id, (counts.get(lesson.module_id) ?? 0) + 1);
  }

  return counts;
}

export async function getPublishedLessonsByModuleIds(
  moduleIds: number[]
): Promise<Lesson[]> {
  if (moduleIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_LIST_SELECT)
    .in("module_id", moduleIds)
    .eq("is_published", true)
    .order("module_id", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) return [];
  return (data ?? []) as Lesson[];
}
