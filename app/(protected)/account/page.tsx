import { ensureCurrentStudent } from "@/lib/students";

export default async function AccountPage() {
  const { student } = await ensureCurrentStudent();

  const initials = student?.name
    ? student.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")
    : "";

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="cb-display">Account</h1>
        <p className="cb-body max-w-2xl">
          Member identity and access state. Minimal, so you can focus on the work.
        </p>
      </section>

      <section className="cb-panel p-6 sm:p-7 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full border border-stone-200 bg-white/60 dark:bg-white/10 flex items-center justify-center text-sm font-semibold text-stone-900 dark:text-stone-50">
              {initials || "CB"}
            </div>
            <div className="min-w-0">
              <div className="cb-eyebrow">Member</div>
              <div className="mt-2 text-xl font-semibold text-stone-900 dark:text-stone-50 truncate">
                {student?.name ?? "Not set"}
              </div>
              <div className="cb-caption mt-1 truncate">
                {student?.email ?? "—"}
              </div>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button type="submit" className="cb-btn cb-btn-secondary">
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="cb-panel p-4 sm:p-5 border border-stone-200/70 bg-white/60">
            <div className="cb-eyebrow">Access level</div>
            <div className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
              {student?.access_level ?? 1}
            </div>
            <div className="mt-1 cb-caption">Your membership tier for academy access.</div>
          </div>
          <div className="cb-panel p-4 sm:p-5 border border-stone-200/70 bg-white/60">
            <div className="cb-eyebrow">Status</div>
            <div className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
              Active
            </div>
            <div className="mt-1 cb-caption">You currently have access to your training path.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
