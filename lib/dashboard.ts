import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/lib/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [modulesRes, lessonsRes] = await Promise.all([
    supabase.from("modules").select("id, is_published", { count: "exact" }),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  const totalModules = modulesRes.count ?? 0;
  const publishedModules =
    modulesRes.data?.filter((m) => m.is_published).length ?? 0;
  const totalLessons = lessonsRes.count ?? 0;

  return {
    totalModules,
    publishedModules,
    totalLessons,
  };
}
