"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/access";
import { setStudentModuleAccessAdmin } from "@/lib/admin/module-access";
import { logAdminAction } from "@/lib/admin/audit";

export async function adminUpdateStudentModuleAccess(
  formData: FormData
): Promise<void> {
  const { actorStudent } = await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const moduleIds = formData
    .getAll("moduleIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!studentId) {
    return;
  }

  const { error } = await setStudentModuleAccessAdmin({
    studentId,
    moduleIds,
    grantedBy: actorStudent.id,
  });

  if (error) {
    throw new Error(error);
  }

  logAdminAction("student.module_access_updated", {
    actorStudentId: actorStudent.id,
    targetStudentId: studentId,
    metadata: { module_ids: moduleIds },
  });

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/modules");
}
