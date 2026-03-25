import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPageLayout } from "@/components/layout/AppPageLayout";
import { AccessLevelSelect } from "@/components/admin/AccessLevelSelect";
import { StudentProgressPanel } from "@/components/admin/StudentProgressPanel";
import { StudentExamOverview } from "@/components/admin/StudentExamOverview";
import { AdminDangerZone } from "@/components/admin/AdminDangerZone";
import { ExamAnalyticsPlaceholder } from "@/components/admin/ExamAnalyticsPlaceholder";
import { getAdminStudentDetail } from "@/lib/admin/students";
import { requireAdmin } from "@/lib/admin/access";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { actorStudent } = await requireAdmin();
  const { id } = await params;

  const detail = await getAdminStudentDetail(id);
  if (!detail) {
    notFound();
  }

  const { student, progressOverview, modules } = detail;
  const label = student.name?.trim() || student.email;

  const pct =
    progressOverview.totalLessonsPublished > 0
      ? Math.round(
          (progressOverview.completedLessons / progressOverview.totalLessonsPublished) * 100
        )
      : 0;

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/students", label: "Students" },
          { label },
        ]}
        eyebrow="Student profile"
        title={label}
        description={student.email}
        actions={
          <Link href="/admin/students" className="cb-btn cb-btn-secondary text-sm">
            ← All students
          </Link>
        }
      />

      <AppPageLayout
        main={
          <>
            <section className="cb-panel p-6" aria-labelledby="identity-heading">
              <h2 id="identity-heading" className="cb-section-title">
                Identity
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="cb-caption text-xs font-bold uppercase tracking-wider">Email</dt>
                  <dd className="mt-1 font-semibold text-[var(--foreground)]">{student.email}</dd>
                </div>
                <div>
                  <dt className="cb-caption text-xs font-bold uppercase tracking-wider">Phone</dt>
                  <dd className="mt-1 font-semibold text-[var(--foreground)]">
                    {student.phone?.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="cb-caption text-xs font-bold uppercase tracking-wider">Access level</dt>
                  <dd className="mt-2">
                    <AccessLevelSelect
                      studentId={student.id}
                      value={student.access_level}
                      actorStudentId={actorStudent.id}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="cb-caption text-xs font-bold uppercase tracking-wider">Joined</dt>
                  <dd className="mt-1 text-[var(--foreground)]">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "long",
                      timeStyle: "short",
                    }).format(new Date(student.created_at))}
                  </dd>
                </div>
                <div>
                  <dt className="cb-caption text-xs font-bold uppercase tracking-wider">Last seen</dt>
                  <dd className="mt-1 text-[var(--foreground)]">
                    {student.last_seen
                      ? new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(student.last_seen))
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="cb-panel p-6" aria-labelledby="summary-heading">
              <h2 id="summary-heading" className="cb-section-title">
                Academy progress
              </h2>
              <p className="cb-body mt-2 max-w-prose">
                Lessons completed across all published modules, and how many module exams have been
                passed at least once.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_85%,var(--background)_15%)] p-4">
                  <div className="cb-caption text-xs font-bold uppercase">Lessons</div>
                  <div className="mt-2 text-2xl font-extrabold text-[var(--foreground)]">
                    {progressOverview.completedLessons}/{progressOverview.totalLessonsPublished}
                  </div>
                  <div className="cb-caption mt-1">{pct}% complete</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_85%,var(--background)_15%)] p-4">
                  <div className="cb-caption text-xs font-bold uppercase">Module exams passed</div>
                  <div className="mt-2 text-2xl font-extrabold text-[var(--foreground)]">
                    {progressOverview.modulesPassedExams}/{progressOverview.totalModulesWithExam}
                  </div>
                  <div className="cb-caption mt-1">At least one passing attempt</div>
                </div>
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="modules-heading">
              <h2 id="modules-heading" className="cb-section-title">
                Module & lesson progress
              </h2>
              <p className="cb-body max-w-prose">
                Lessons are grouped by module. Actions only affect lesson progress unless stated
                otherwise; exam results stay intact unless you add a dedicated future workflow.
              </p>
              <StudentProgressPanel modules={modules} studentId={student.id} />
            </section>

            <StudentExamOverview modules={modules} />

            <ExamAnalyticsPlaceholder />
          </>
        }
        rail={
          <AdminDangerZone studentId={student.id} studentLabel={label} />
        }
      />
    </div>
  );
}
