import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ensureCurrentStudent } from "@/lib/students";
import { AppShell } from "@/components/AppShell";
import { AsyncAdminNavItem } from "@/components/AsyncAdminNavItem";
import { ADMIN_ACCESS_LEVEL } from "@/lib/admin/constants";

async function ProtectedStudentGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { student, error } = await ensureCurrentStudent();

  if (error || !student) {
    redirect("/?redirectedFrom=" + encodeURIComponent("/dashboard"));
  }

  return <>{children}</>;
}

async function ProtectedAdminNav() {
  const { student } = await ensureCurrentStudent();
  return student?.access_level === ADMIN_ACCESS_LEVEL ? (
    <AsyncAdminNavItem />
  ) : null;
}

function ProtectedContentFallback() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-4 w-32 rounded bg-stone-200" />
      <div className="mt-5 h-10 w-2/3 max-w-xl rounded-lg bg-stone-200" />
      <div className="mt-4 h-4 w-full max-w-2xl rounded bg-stone-100" />
      <div className="mt-10 h-64 rounded-2xl border border-stone-200 bg-white" />
    </div>
  );
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "test") {
    // Test-mode: geen auth/redirects nodig; render gewoon de protected UI.
    return (
      <AppShell studentName={null} showAdminNav={false}>
        {children}
      </AppShell>
    );
  }

  if (process.env.PROJECT_SPEED_STREAM_PROTECTED_SHELL === "on") {
    return (
      <AppShell
        studentName={null}
        asyncAdminNav={
          <Suspense fallback={null}>
            <ProtectedAdminNav />
          </Suspense>
        }
      >
        <Suspense fallback={<ProtectedContentFallback />}>
          <ProtectedStudentGate>{children}</ProtectedStudentGate>
        </Suspense>
      </AppShell>
    );
  }

  const { student, error } = await ensureCurrentStudent();

  if (error) {
    redirect("/?redirectedFrom=" + encodeURIComponent("/dashboard"));
  }

  if (!student) {
    redirect("/?redirectedFrom=" + encodeURIComponent("/dashboard"));
  }

  return (
    <AppShell
      studentName={student.name ?? null}
      showAdminNav={student.access_level === ADMIN_ACCESS_LEVEL}
    >
      {children}
    </AppShell>
  );
}
