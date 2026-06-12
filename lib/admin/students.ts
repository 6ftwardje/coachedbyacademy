import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";
import type { AdminSortField, AdminStudentListRow } from "@/lib/admin/types";
import { buildAdminStudentProgressDetail } from "@/lib/admin/progress";
import type { AdminStudentDetail } from "@/lib/admin/types";
import { requireAdmin } from "@/lib/admin/access";
import { getStudentModuleAccessIdsAdmin } from "@/lib/admin/module-access";
import { timeAsync } from "@/lib/perf";

type ListParams = {
  q?: string;
  sortBy: AdminSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};

export async function listStudentsAdmin(
  params: ListParams
): Promise<{ rows: AdminStudentListRow[]; hasNextPage: boolean }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { rows: [], hasNextPage: false };
  }

  const db = await createClient();
  const { q, sortBy, order, page, pageSize } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  let qBuilder = db
    .from("students")
    .select("id, email, name, phone, access_level, created_at, last_seen");

  const trimmed = q?.trim();
  if (trimmed) {
    // PostgREST `or` requires quoted ilike values so `%` / commas in the pattern don’t break the parser.
    const like = `%${trimmed.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    const quoted = `"${like.replace(/"/g, '""')}"`;
    qBuilder = qBuilder.or(`name.ilike.${quoted},email.ilike.${quoted}`);
  }

  qBuilder = qBuilder.order(sortBy, {
    ascending: order === "asc",
    nullsFirst: false,
  });

  const { data, error } = await timeAsync("[perf] admin.list.query", () =>
    qBuilder.range(from, to)
  );

  if (error) {
    console.error(
      "listStudentsAdmin",
      error.message,
      error.code,
      error.details,
      error.hint
    );
    return { rows: [], hasNextPage: false };
  }

  const rows = ((data ?? []) as AdminStudentListRow[]).slice(0, pageSize);

  return {
    rows,
    hasNextPage: (data?.length ?? 0) > pageSize,
  };
}

export async function getStudentByIdAdmin(
  studentId: string
): Promise<Student | null> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const db = await createClient();
  const { data, error } = await db
    .from("students")
    .select("id, email, name, auth_user_id, access_level, created_at, updated_at, last_seen, phone")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Student;
}

export async function getAdminStudentDetail(studentId: string): Promise<AdminStudentDetail | null> {
  const student = await timeAsync("[perf] detail.query", () =>
    getStudentByIdAdmin(studentId)
  );
  if (!student) return null;

  const [{ overview, modules }, explicitModuleAccessIds] = await timeAsync(
    "[perf] detail.query",
    () =>
      Promise.all([
        buildAdminStudentProgressDetail(studentId),
        getStudentModuleAccessIdsAdmin(studentId),
      ])
  );

  return {
    student,
    progressOverview: overview,
    modules,
    explicitModuleAccessIds: [...explicitModuleAccessIds],
  };
}

export async function updateStudentAccessLevelAdmin(
  targetStudentId: string,
  accessLevel: number
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const db = await createClient();
  const { data: exists, error: fetchError } = await db
    .from("students")
    .select("id")
    .eq("id", targetStudentId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!exists) return { error: "Student not found" };

  const { error } = await db
    .from("students")
    .update({ access_level: accessLevel })
    .eq("id", targetStudentId);

  if (error) return { error: error.message };
  return { error: null };
}
