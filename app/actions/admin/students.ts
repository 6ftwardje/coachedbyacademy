"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, parseAccessLevel } from "@/lib/admin/access";
import { ADMIN_ACCESS_LEVEL } from "@/lib/admin/constants";
import {
  updateStudentAccessLevelAdmin,
} from "@/lib/admin/students";
import { logAdminAction } from "@/lib/admin/audit";

export async function adminUpdateStudentAccessLevel(
  targetStudentId: string,
  rawLevel: unknown
): Promise<{ success: boolean; error?: string }> {
  const { actorStudent } = await requireAdmin();
  const level = parseAccessLevel(rawLevel);
  if (level === null) {
    return { success: false, error: "Invalid access level" };
  }

  if (
    targetStudentId === actorStudent.id &&
    level < ADMIN_ACCESS_LEVEL
  ) {
    return {
      success: false,
      error: "You cannot remove your own admin access from this account.",
    };
  }

  const { error } = await updateStudentAccessLevelAdmin(targetStudentId, level);
  if (error) {
    return { success: false, error };
  }

  logAdminAction("student.access_level_updated", {
    actorStudentId: actorStudent.id,
    targetStudentId,
    metadata: { access_level: level },
  });

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${targetStudentId}`);
  return { success: true };
}
