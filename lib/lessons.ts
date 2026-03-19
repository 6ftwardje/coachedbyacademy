import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/lib/types";

export async function getLessonBySlug(slug: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("slug", slug)
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
    .select("*")
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
