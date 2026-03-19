import Link from "next/link";
import { ensureCurrentStudent } from "@/lib/students";
import { getPublishedModules } from "@/lib/modules";
import { getLessonCountByModuleId } from "@/lib/lessons";
import { getModuleAccessMap } from "@/lib/module-gate";

export default async function ModulesPage() {
  const { student } = await ensureCurrentStudent();
  const modules = await getPublishedModules();
  const lessonCounts = await Promise.all(
    modules.map((m) => getLessonCountByModuleId(m.id))
  );

  const moduleAccessMap = student
    ? await getModuleAccessMap(student.id, modules)
    : new Map<number, boolean>();

  const orderedModules = [...modules].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Modules</h1>
        <p className="text-stone-600 mt-1">
          Course modules in order. Complete lessons and pass the exam to unlock
          the next module.
        </p>
      </div>

      {orderedModules.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">
          No published modules yet.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {orderedModules.map((mod, i) => {
            const canAccess = moduleAccessMap.get(mod.id) === true;
            return (
              <li key={mod.id}>
                {canAccess ? (
                  <Link
                    href={`/modules/${mod.slug}`}
                    className="block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm hover:border-stone-300 hover:shadow transition-colors"
                  >
                    <span className="text-xs font-medium text-stone-500">
                      Module {mod.order_index}
                    </span>
                    <h2 className="mt-1 text-lg font-semibold text-stone-900">
                      {mod.title}
                    </h2>
                    {mod.short_description && (
                      <p className="mt-2 text-sm text-stone-600 line-clamp-2">
                        {mod.short_description}
                      </p>
                    )}
                    <p className="mt-4 text-sm text-stone-500">
                      {lessonCounts[i]} lesson{lessonCounts[i] !== 1 ? "s" : ""}
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-stone-700">
                      Open module →
                    </span>
                  </Link>
                ) : (
                  <div className="block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm opacity-80">
                    <span className="text-xs font-medium text-stone-500">
                      Module {mod.order_index}
                    </span>
                    <h2 className="mt-1 text-lg font-semibold text-stone-500">
                      {mod.title}
                    </h2>
                    {mod.short_description && (
                      <p className="mt-2 text-sm text-stone-500 line-clamp-2">
                        {mod.short_description}
                      </p>
                    )}
                    <p className="mt-4 text-sm text-stone-500">
                      {lessonCounts[i]} lesson{lessonCounts[i] !== 1 ? "s" : ""}
                    </p>
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
  );
}
