import Link from "next/link";
import { ensureCurrentStudent } from "@/lib/students";
import { getModulesOverview } from "@/lib/modules-overview";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPageLayout } from "@/components/layout/AppPageLayout";
import { ModuleStateBadge } from "@/components/StatusBadge";
import { CourseThumbnail } from "@/components/CourseThumbnail";
import { asText } from "@/lib/as-text";

export default async function ModulesPage() {
  const { student } = await ensureCurrentStudent();
  if (!student) return null;
  const {
    orderedModules,
    lessonCountMap,
    moduleStateMap,
    hasLockedModules,
  } = await getModulesOverview(student.id);

  const main =
    orderedModules.length === 0 ? (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 text-center">
        <p className="cb-caption">Er zijn nog geen modules beschikbaar.</p>
      </div>
    ) : (
      <ul className="grid gap-5 md:grid-cols-2">
          {orderedModules.map((mod) => {
            const state = moduleStateMap.get(mod.id) ?? "locked";
            const canOpen = state === "available" || state === "completed";
            const lessonCount = lessonCountMap.get(mod.id) ?? 0;
            const shortDesc = asText(mod.short_description);
            return (
            <li key={mod.id}>
              {canOpen ? (
                <Link
                  href={`/modules/${mod.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[color-mix(in_oklab,var(--foreground)_28%,var(--border)_72%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)_22%,transparent)]"
                >
                  <CourseThumbnail
                    src={mod.thumbnail_url}
                    title={mod.title}
                    eyebrow={`Module ${mod.order_index}`}
                    className="aspect-[16/10] w-full"
                    imageClassName="group-hover:scale-[1.035]"
                  />
                  <div className="flex min-h-[190px] flex-col p-5 sm:p-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <ModuleStateBadge state={state} />
                        <span className="cb-caption">
                          {lessonCount} {lessonCount === 1 ? "les" : "lessen"}
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-semibold leading-snug text-[var(--foreground)]">
                        {mod.title}
                      </h2>
                        {shortDesc && (
                          <p className="cb-caption mt-1 line-clamp-2">
                            {shortDesc}
                          </p>
                        )}
                      </div>
                      <div className="mt-5 text-sm font-semibold text-[var(--foreground)]">
                        Openen
                      </div>
                  </div>
                </Link>
              ) : (
                <div className="h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_92%,var(--muted)_8%)]">
                  <CourseThumbnail
                    src={mod.thumbnail_url}
                    title={mod.title}
                    eyebrow={`Module ${mod.order_index}`}
                    className="aspect-[16/10] w-full"
                  />
                  <div className="flex min-h-[190px] flex-col p-5 sm:p-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <ModuleStateBadge state={state} />
                        <span className="cb-caption">
                          {lessonCount} {lessonCount === 1 ? "les" : "lessen"}
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-semibold leading-snug text-[var(--foreground)]">
                        {mod.title}
                      </h2>
                      {shortDesc && (
                        <p className="cb-caption mt-1 line-clamp-2">
                          {shortDesc}
                        </p>
                      )}
                    </div>
                    <div className="mt-5 text-sm">
                      <span className="cb-caption">Komt vrij na de vorige toets</span>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Modules" }]}
        eyebrow="Jouw opleiding"
        title="Modules"
        description="Werk in volgorde. Rond de lessen en toets af om het volgende blok vrij te spelen."
      />
      <AppPageLayout main={main} />
      {hasLockedModules && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-4 z-30 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6"
        >
          <div className="max-w-sm rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_92%,var(--background)_8%)] px-4 py-3 text-sm text-[var(--foreground)] shadow-[0_18px_50px_rgba(28,25,23,0.16)] backdrop-blur-md dark:shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
            <span className="font-semibold">Modules vergrendeld</span>
            <span className="ml-2 text-[var(--muted)]">
              Rond eerst de vorige moduletoets af.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
