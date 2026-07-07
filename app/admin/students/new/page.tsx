import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddStudentForm } from "@/components/admin/AddStudentForm";
import { listPublishedModulesForStudentInviteAdmin } from "@/lib/admin/students";
import { requireAdmin } from "@/lib/admin/access";

export default async function NewAdminStudentPage() {
  await requireAdmin();
  const modules = await listPublishedModulesForStudentInviteAdmin();

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/students", label: "Students" },
          { label: "Add student" },
        ]}
        eyebrow="Invite"
        title="Add student"
        description="Create a student profile, choose module access, and send an email invite."
        actions={
          <Link href="/admin/students" className="cb-btn cb-btn-secondary text-sm">
            Back to students
          </Link>
        }
      />

      <div className="max-w-4xl">
        <AddStudentForm modules={modules} />
      </div>
    </div>
  );
}
