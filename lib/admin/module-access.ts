import { requireAdmin } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";
import { isMissingSupabaseTableError } from "@/lib/supabase/errors";

const STUDENT_MODULE_ACCESS_TABLE = "student_module_access";
const MISSING_TABLE_ERROR =
  "Student module access is not set up in Supabase yet. Apply migration 20260608000000_student_module_access.sql.";

export async function getStudentModuleAccessIdsAdmin(
  studentId: string
): Promise<Set<number>> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return new Set();
  }

  const db = await createClient();
  const { data, error } = await db
    .from("student_module_access")
    .select("module_id")
    .eq("student_id", studentId);

  if (error) {
    if (isMissingSupabaseTableError(error, STUDENT_MODULE_ACCESS_TABLE)) {
      return new Set();
    }

    console.error("getStudentModuleAccessIdsAdmin", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => Number(row.module_id)));
}

export async function setStudentModuleAccessAdmin({
  studentId,
  moduleIds,
  grantedBy,
}: {
  studentId: string;
  moduleIds: number[];
  grantedBy: string;
}): Promise<{ error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { error: null };
  }

  const uniqueModuleIds = [...new Set(moduleIds.filter(Number.isInteger))];
  const db = await createClient();

  const { error: deleteError } = await db
    .from("student_module_access")
    .delete()
    .eq("student_id", studentId);

  if (deleteError) {
    return {
      error: isMissingSupabaseTableError(
        deleteError,
        STUDENT_MODULE_ACCESS_TABLE
      )
        ? MISSING_TABLE_ERROR
        : deleteError.message,
    };
  }

  if (uniqueModuleIds.length === 0) {
    return { error: null };
  }

  const { error: insertError } = await db.from("student_module_access").insert(
    uniqueModuleIds.map((moduleId) => ({
      student_id: studentId,
      module_id: moduleId,
      granted_by: grantedBy,
    }))
  );

  if (insertError) {
    return {
      error: isMissingSupabaseTableError(
        insertError,
        STUDENT_MODULE_ACCESS_TABLE
      )
        ? MISSING_TABLE_ERROR
        : insertError.message,
    };
  }

  return { error: null };
}
