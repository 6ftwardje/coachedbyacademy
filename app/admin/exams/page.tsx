import { PageHeader } from "@/components/layout/PageHeader";
import { AdminExamManager } from "@/components/admin/AdminExamManager";
import { listAdminExamModules } from "@/lib/admin/exam-questions";

export default async function AdminExamsPage() {
  const modules = await listAdminExamModules();

  return (
    <div>
      <PageHeader
        eyebrow="Examens"
        title="Toetsvragen"
        description="Beheer moduletoetsen, actieve vragen en de minimale set van 10 geldige vragen per examen."
      />
      <AdminExamManager modules={modules} />
    </div>
  );
}
