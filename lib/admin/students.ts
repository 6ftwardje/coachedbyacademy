import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Student } from "@/lib/types";
import type {
  AdminSortField,
  AdminStudentInviteModuleOption,
  AdminStudentListRow,
} from "@/lib/admin/types";
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

type CreateStudentInviteParams = {
  email: string;
  name: string | null;
  phone: string | null;
  accessLevel: number;
  moduleIds: number[];
  invitedBy: string;
  redirectTo: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

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

export async function listPublishedModulesForStudentInviteAdmin(): Promise<
  AdminStudentInviteModuleOption[]
> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return [];
  }

  const db = await createClient();
  const { data: moduleRows, error: moduleError } = await db
    .from("modules")
    .select("id, title, order_index")
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  if (moduleError) {
    console.error("listPublishedModulesForStudentInviteAdmin", moduleError.message);
    return [];
  }

  const moduleIds = (moduleRows ?? []).map((module) => Number(module.id));
  const lessonCounts = new Map<number, number>();

  if (moduleIds.length > 0) {
    const { data: lessonRows, error: lessonError } = await db
      .from("lessons")
      .select("module_id")
      .eq("is_published", true)
      .in("module_id", moduleIds);

    if (lessonError) {
      console.error(
        "listPublishedModulesForStudentInviteAdmin.lessons",
        lessonError.message
      );
    } else {
      for (const row of lessonRows ?? []) {
        const moduleId = Number((row as { module_id: number }).module_id);
        lessonCounts.set(moduleId, (lessonCounts.get(moduleId) ?? 0) + 1);
      }
    }
  }

  return (moduleRows ?? []).map((module) => ({
    id: Number(module.id),
    title: String(module.title),
    order_index: Number(module.order_index),
    totalLessons: lessonCounts.get(Number(module.id)) ?? 0,
  }));
}

export async function createStudentInviteAdmin(
  params: CreateStudentInviteParams
): Promise<{ studentId: string | null; error: string | null }> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return { studentId: "00000000-0000-0000-0000-000000000010", error: null };
  }

  const email = normalizeEmail(params.email);
  const name = normalizeOptionalText(params.name);
  const phone = normalizeOptionalText(params.phone);

  if (!email || !email.includes("@")) {
    return { studentId: null, error: "Enter a valid email address." };
  }

  if (![1, 2].includes(params.accessLevel)) {
    return {
      studentId: null,
      error: "New students can only be invited with student access.",
    };
  }

  const uniqueModuleIds = [...new Set(params.moduleIds)]
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);

  let db: ReturnType<typeof createServiceClient>;
  try {
    db = createServiceClient();
  } catch (error) {
    return {
      studentId: null,
      error: error instanceof Error ? error.message : "Service client unavailable.",
    };
  }
  const { data: existingStudent, error: existingError } = await db
    .from("students")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingError) {
    return { studentId: null, error: existingError.message };
  }

  if (existingStudent) {
    return {
      studentId: null,
      error: "A student with this email address already exists.",
    };
  }

  if (uniqueModuleIds.length > 0) {
    const { error: accessTableError } = await db
      .from("student_module_access")
      .select("id")
      .limit(1);

    if (accessTableError) {
      return {
        studentId: null,
        error: accessTableError.message,
      };
    }

    const { data: moduleRows, error: moduleError } = await db
      .from("modules")
      .select("id")
      .eq("is_published", true)
      .in("id", uniqueModuleIds);

    if (moduleError) {
      return { studentId: null, error: moduleError.message };
    }

    const validModuleIds = new Set(
      (moduleRows ?? []).map((module) => Number(module.id))
    );
    const invalid = uniqueModuleIds.some((moduleId) => !validModuleIds.has(moduleId));
    if (invalid) {
      return {
        studentId: null,
        error: "One or more selected modules are no longer available.",
      };
    }
  }

  const { data: inviteData, error: inviteError } =
    await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: params.redirectTo,
      data: {
        full_name: name,
        invited_by_student_id: params.invitedBy,
      },
    });

  if (inviteError || !inviteData.user) {
    return {
      studentId: null,
      error: inviteError?.message ?? "The invite could not be sent.",
    };
  }

  const { data: insertedStudent, error: insertError } = await db
    .from("students")
    .insert({
      auth_user_id: inviteData.user.id,
      email,
      name,
      phone,
      access_level: params.accessLevel,
    })
    .select("id")
    .single();

  if (insertError || !insertedStudent) {
    return {
      studentId: null,
      error: insertError?.message ?? "The student profile could not be created.",
    };
  }

  const studentId = String(insertedStudent.id);

  if (uniqueModuleIds.length > 0) {
    const { error: accessError } = await db.from("student_module_access").insert(
      uniqueModuleIds.map((moduleId) => ({
        student_id: studentId,
        module_id: moduleId,
        granted_by: params.invitedBy,
      }))
    );

    if (accessError) {
      return { studentId: null, error: accessError.message };
    }
  }

  return { studentId, error: null };
}

export async function getStudentByIdAdmin(
  studentId: string
): Promise<Student | null> {
  await requireAdmin();

  if (process.env.NODE_ENV === "test") {
    return null;
  }

  let db: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient>;
  try {
    db = createServiceClient();
  } catch {
    db = await createClient();
  }

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
