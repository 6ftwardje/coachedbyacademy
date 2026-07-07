"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { adminCreateStudentInvite } from "@/app/actions/admin/students";
import { ALL_MODULES_ACCESS_LEVEL } from "@/lib/admin/constants";
import type { AdminStudentInviteModuleOption } from "@/lib/admin/types";

function fieldClass() {
  return "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] outline-none ring-offset-2 placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)_22%,transparent)]";
}

export function AddStudentForm({
  modules,
}: {
  modules: AdminStudentInviteModuleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customModules, setCustomModules] = useState(false);
  const allModuleIds = useMemo(() => modules.map((module) => module.id), [modules]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>(allModuleIds);

  function setModuleMode(nextCustom: boolean) {
    setCustomModules(nextCustom);
    if (nextCustom && selectedModuleIds.length === 0) {
      setSelectedModuleIds(allModuleIds);
    }
  }

  function toggleModule(moduleId: number, checked: boolean) {
    setSelectedModuleIds((current) => {
      if (checked) return [...new Set([...current, moduleId])].sort((a, b) => a - b);
      return current.filter((id) => id !== moduleId);
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!customModules) {
      formData.delete("moduleIds");
    }

    setError(null);
    startTransition(async () => {
      const result = await adminCreateStudentInvite(formData);
      if (!result.success || !result.studentId) {
        setError(result.error ?? "Invite failed.");
        return;
      }

      router.push(`/admin/students/${result.studentId}`);
      router.refresh();
    });
  }

  const allSelected =
    modules.length > 0 && selectedModuleIds.length === modules.length;

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="cb-panel p-6" aria-labelledby="student-details-heading">
        <h2 id="student-details-heading" className="cb-section-title">
          Student details
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[var(--foreground)]">
              Name
            </span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              className={fieldClass()}
              placeholder="Jane Doe"
              disabled={pending}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[var(--foreground)]">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={fieldClass()}
              placeholder="student@example.com"
              disabled={pending}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[var(--foreground)]">
              Phone
            </span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              className={fieldClass()}
              placeholder="+32 ..."
              disabled={pending}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[var(--foreground)]">
              Access level
            </span>
            <select
              name="accessLevel"
              defaultValue={ALL_MODULES_ACCESS_LEVEL}
              className={fieldClass()}
              disabled={pending}
            >
              <option value="1">Level 1 - Standard progression</option>
              <option value="2">Level 2 - All modules</option>
            </select>
          </label>
        </div>
      </section>

      <section className="cb-panel p-6" aria-labelledby="module-access-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="module-access-heading" className="cb-section-title">
              Module access
            </h2>
            <p className="cb-caption mt-2 max-w-prose">
              Keep the default flow, or create an explicit allowlist for this student.
            </p>
          </div>
          <span className="cb-badge cb-badge-available">
            {customModules ? `${selectedModuleIds.length} selected` : "Default flow"}
          </span>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
              !customModules
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
            }`}
            onClick={() => setModuleMode(false)}
            disabled={pending}
          >
            Default access
            <span className="mt-1 block text-xs font-medium opacity-75">
              Follows the selected access level.
            </span>
          </button>
          <button
            type="button"
            className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
              customModules
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
            }`}
            onClick={() => setModuleMode(true)}
            disabled={pending || modules.length === 0}
          >
            Custom module access
            <span className="mt-1 block text-xs font-medium opacity-75">
              Only checked modules will be visible.
            </span>
          </button>
        </div>

        {customModules && modules.length > 0 && (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="cb-btn cb-btn-secondary text-xs"
                onClick={() => setSelectedModuleIds(allModuleIds)}
                disabled={pending || allSelected}
              >
                Select all
              </button>
              <button
                type="button"
                className="cb-btn cb-btn-secondary text-xs"
                onClick={() => setSelectedModuleIds([])}
                disabled={pending || selectedModuleIds.length === 0}
              >
                Clear
              </button>
            </div>
            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {modules.map((module) => {
                const checked = selectedModuleIds.includes(module.id);
                return (
                  <label
                    key={module.id}
                    className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-[color-mix(in_oklab,var(--card)_88%,var(--foreground)_3%)]"
                  >
                    <input
                      type="checkbox"
                      name="moduleIds"
                      value={module.id}
                      checked={checked}
                      onChange={(event) => toggleModule(module.id, event.target.checked)}
                      disabled={pending}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--foreground)]">
                        Module {module.order_index}: {module.title}
                      </span>
                      <span className="cb-caption mt-1 block">
                        {module.totalLessons}{" "}
                        {module.totalLessons === 1 ? "lesson" : "lessons"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="cb-btn cb-btn-secondary"
          onClick={() => router.push("/admin/students")}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="cb-btn cb-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Sending invite..." : "Create student & invite"}
        </button>
      </div>
    </form>
  );
}
