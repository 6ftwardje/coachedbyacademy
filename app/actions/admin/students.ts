"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin, parseAccessLevel } from "@/lib/admin/access";
import { ADMIN_ACCESS_LEVEL, ALL_MODULES_ACCESS_LEVEL } from "@/lib/admin/constants";
import {
  createStudentInviteAdmin,
  updateStudentAccessLevelAdmin,
} from "@/lib/admin/students";
import { logAdminAction } from "@/lib/admin/audit";

function getRequestOrigin(headersList: Headers) {
  const origin = headersList.get("origin");
  if (origin) return origin;

  const forwardedProto = headersList.get("x-forwarded-proto");
  const forwardedHost = headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const referer = headersList.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

function buildInviteRedirectTo(origin: string) {
  const confirmUrl = new URL("/auth/confirm", origin);
  confirmUrl.searchParams.set("next", "/account/update-password");
  return confirmUrl.toString();
}

export async function adminCreateStudentInvite(
  formData: FormData
): Promise<{ success: boolean; studentId?: string; error?: string }> {
  const { actorStudent } = await requireAdmin();
  const headersList = await headers();
  const origin = getRequestOrigin(headersList);

  if (!origin) {
    return {
      success: false,
      error: "Could not determine the app URL for the invite email.",
    };
  }

  const rawAccessLevel = formData.get("accessLevel") ?? ALL_MODULES_ACCESS_LEVEL;
  const accessLevel = parseAccessLevel(rawAccessLevel);
  if (accessLevel === null || accessLevel === ADMIN_ACCESS_LEVEL) {
    return {
      success: false,
      error: "Choose a student access level.",
    };
  }

  const moduleIds = formData
    .getAll("moduleIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  const result = await createStudentInviteAdmin({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    accessLevel,
    moduleIds,
    invitedBy: actorStudent.id,
    redirectTo: buildInviteRedirectTo(origin),
  });

  if (result.error || !result.studentId) {
    return { success: false, error: result.error ?? "Invite failed." };
  }

  logAdminAction("student.invited", {
    actorStudentId: actorStudent.id,
    targetStudentId: result.studentId,
    metadata: {
      access_level: accessLevel,
      module_ids: moduleIds,
    },
  });

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${result.studentId}`);
  return { success: true, studentId: result.studentId };
}

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
