import Link from "next/link";
import { ensureCurrentStudent } from "@/lib/students";
import { getDashboardStats } from "@/lib/dashboard";
import { getPublishedModules } from "@/lib/modules";
import { getModuleAccessMap } from "@/lib/module-gate";

export default async function DashboardPage() {
  const { student } = await ensureCurrentStudent();
  const [stats, modules, moduleAccessMap] = await Promise.all([
    getDashboardStats(),
    getPublishedModules(),
    (async () => {
      const mods = await getPublishedModules();
      if (!student) return new Map<number, boolean>();
      return getModuleAccessMap(student.id, mods);
    })(),
  ]);

  const orderedModules = [...modules].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          {student?.name ? `Welcome, ${student.name}` : "Dashboard"}
        </h1>
        <p className="text-stone-600 mt-1">
          Your learning overview and next steps.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Total modules</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {stats.totalModules}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Published modules</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {stats.publishedModules}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Total lessons</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {stats.totalLessons}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">
          Modules
        </h2>
        {orderedModules.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-600 text-sm">
            No published modules yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {orderedModules.map((mod) => {
              const canAccess = moduleAccessMap.get(mod.id) === true;
              return (
                <li key={mod.id}>
                  {canAccess ? (
                    <Link
                      href={`/modules/${mod.slug}`}
                      className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-300 hover:shadow transition-colors"
                    >
                      <span className="text-xs font-medium text-stone-500">
                        Module {mod.order_index}
                      </span>
                      <h3 className="mt-1 font-semibold text-stone-900">
                        {mod.title}
                      </h3>
                      {mod.short_description && (
                        <p className="mt-2 text-sm text-stone-600 line-clamp-2">
                          {mod.short_description}
                        </p>
                      )}
                      <span className="mt-3 inline-block text-sm font-medium text-stone-700">
                        Open module →
                      </span>
                    </Link>
                  ) : (
                    <div className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm opacity-80">
                      <span className="text-xs font-medium text-stone-500">
                        Module {mod.order_index}
                      </span>
                      <h3 className="mt-1 font-semibold text-stone-500">
                        {mod.title}
                      </h3>
                      {mod.short_description && (
                        <p className="mt-2 text-sm text-stone-500 line-clamp-2">
                          {mod.short_description}
                        </p>
                      )}
                      <span className="mt-3 inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Locked — pass previous module exam
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
