import type { AdminModuleProgressBlock } from "@/lib/admin/types";
import { adminUpdateStudentModuleAccess } from "@/app/actions/admin/module-access";

export function StudentModuleAccessPanel({
  accessLevel,
  modules,
  selectedModuleIds,
  studentId,
}: {
  accessLevel: number;
  modules: AdminModuleProgressBlock[];
  selectedModuleIds: number[];
  studentId: string;
}) {
  const selected = new Set(selectedModuleIds);
  const hasExplicitAccess = selected.size > 0;

  return (
    <section className="cb-panel p-6" aria-labelledby="module-access-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="module-access-heading" className="cb-section-title">
            Module access
          </h2>
          <p className="cb-caption mt-2 max-w-prose">
            No selection follows the student&apos;s access level
            {accessLevel >= 2
              ? " (all modules). "
              : " (standard academy progression). "}
            Select one or more modules to override that and show only those
            modules.
          </p>
        </div>
        <span className="cb-badge cb-badge-available">
          {hasExplicitAccess ? `${selected.size} selected` : "Standard flow"}
        </span>
      </div>

      <form action={adminUpdateStudentModuleAccess} className="mt-5 space-y-4">
        <input type="hidden" name="studentId" value={studentId} />
        {modules.length === 0 ? (
          <p className="cb-caption">No published modules available.</p>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
            {modules.map(({ module, totalLessons }) => (
              <label
                key={module.id}
                className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-[color-mix(in_oklab,var(--card)_88%,var(--foreground)_3%)]"
              >
                <input
                  type="checkbox"
                  name="moduleIds"
                  value={module.id}
                  defaultChecked={selected.has(module.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    Module {module.order_index}: {module.title}
                  </span>
                  <span className="cb-caption mt-1 block">
                    {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <button type="submit" className="cb-btn cb-btn-primary">
          Save module access
        </button>
      </form>
    </section>
  );
}
