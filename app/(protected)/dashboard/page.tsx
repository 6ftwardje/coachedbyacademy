import Link from "next/link";
import { CourseThumbnail } from "@/components/CourseThumbnail";
import { HomeIntroVideoPlayer } from "@/components/HomeIntroVideoPlayer";
import { DeferredMuxBackgroundVideo } from "@/components/DeferredMuxBackgroundVideo";
import { ModuleStateBadge } from "@/components/StatusBadge";
import { AppPageLayout } from "@/components/layout/AppPageLayout";
import { ContentSection } from "@/components/layout/ContentSection";
import { asText } from "@/lib/as-text";
import {
  getDashboardOverview,
  type DashboardModuleSummary,
} from "@/lib/dashboard";
import { getHomeIntroVideo } from "@/lib/home-intro-video";
import { ensureCurrentStudent } from "@/lib/students";

const DASHBOARD_HERO_PLAYBACK_ID =
  "E148xcK02Dv7Ov2g5waf4rXIobyhjorWNje025M48QzNM";

function ModuleRow({ summary }: { summary: DashboardModuleSummary }) {
  const canOpen = summary.state !== "locked";
  const content = (
    <div className="grid gap-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] sm:grid-cols-[150px_minmax(0,1fr)]">
      <CourseThumbnail
        src={summary.module.thumbnail_url}
        title={summary.module.title}
        eyebrow={`Module ${summary.module.order_index}`}
        className="aspect-[16/7] w-full sm:aspect-auto sm:h-full sm:min-h-[118px]"
        imageClassName={canOpen ? "group-hover:scale-[1.035]" : ""}
        muted={!canOpen}
      />
      <div className="flex min-w-0 items-start justify-between gap-5 p-4 sm:p-5">
        <div className="min-w-0">
          <ModuleStateBadge state={summary.state} />
          <h3 className="mt-2 font-semibold leading-snug text-[var(--foreground)]">
            {summary.module.title}
          </h3>
          <p className="mt-1 cb-caption">
            {summary.completedLessons}/{summary.totalLessons} lessen afgerond
          </p>
        </div>
        {canOpen && (
          <span className="shrink-0 text-sm font-semibold text-[var(--foreground)]">
            Openen
          </span>
        )}
      </div>
    </div>
  );

  if (!canOpen) return <li className="opacity-65">{content}</li>;

  return (
    <li>
      <Link
        href={`/modules/${summary.module.slug}`}
        className="group block rounded-2xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)_22%,transparent)]"
      >
        {content}
      </Link>
    </li>
  );
}

export default async function DashboardPage() {
  const { student } = await ensureCurrentStudent();
  if (!student) return null;

  const [overview, introVideo] = await Promise.all([
    getDashboardOverview(student.id),
    getHomeIntroVideo(),
  ]);
  const { nextStep, modules } = overview;
  const firstName = student.name?.split(" ")[0] ?? null;
  const title = firstName ? `Welkom terug, ${firstName}` : "Welkom terug";
  const activeIndex = modules.findIndex((summary) => summary.state === "available");
  const visibleModules =
    activeIndex >= 0 ? modules.slice(activeIndex, activeIndex + 2) : modules.slice(-2);

  const stepTitle =
    nextStep.type === "lesson"
      ? nextStep.lesson.title
      : nextStep.type === "exam"
        ? nextStep.exam.title
        : nextStep.type === "completed"
          ? "Je traject is afgerond"
          : nextStep.module.title;
  const stepCopy =
    nextStep.type === "lesson"
      ? asText(nextStep.lesson.takeaway) ??
        asText(nextStep.lesson.description) ??
        "Bekijk de les en werk daarna de opdrachten af."
      : nextStep.type === "exam"
        ? "Je hebt alle lessen van deze module bekeken. Rond nu de moduletoets af."
        : nextStep.type === "completed"
          ? "Mooi werk. Je hebt alle beschikbare modules doorlopen."
          : "Open de module om verder te gaan met je traject.";
  const moduleTitle = nextStep.module?.title ?? "Academy";
  const moduleOrder = nextStep.module?.order_index;
  const pct =
    nextStep.totalLessons > 0
      ? Math.round((nextStep.completedLessons / nextStep.totalLessons) * 100)
      : 0;

  const actionSummary =
    nextStep.type === "lesson" && nextStep.actions.length > 0
      ? {
          completed: nextStep.actions.filter((_, index) =>
            nextStep.actionProgress.get(index)
          ).length,
          total: nextStep.actions.length,
          next:
            nextStep.actions.find(
              (_, index) => !nextStep.actionProgress.get(index)
            ) ?? null,
        }
      : null;

  return (
    <div>
      <AppPageLayout
        main={
          <>
            <section className="cb-dashboard-hero-bleed relative isolate h-[50vh] max-h-[520px] overflow-hidden bg-stone-950 text-white">
              <div className="absolute inset-0 bg-stone-950" />
              <div className="absolute inset-0 opacity-34">
                <DeferredMuxBackgroundVideo
                  playbackId={DASHBOARD_HERO_PLAYBACK_ID}
                />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,10,9,0.96)_0%,rgba(12,10,9,0.7)_50%,rgba(12,10,9,0.9)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950 to-transparent" />

              <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-7 lg:p-8">
                <div className="max-w-4xl">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white/56">
                    Home
                  </p>
                  <h1 className="mt-3 text-4xl font-extrabold leading-[1.02] text-white sm:text-5xl lg:text-[3.5rem]">
                    {title}
                  </h1>
                </div>

                <div className="mt-8 grid gap-6 border-t border-white/14 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-end">
                  <div className="min-w-0">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white/56">
                      {nextStep.type === "lesson"
                        ? "Jouw huidige les"
                        : nextStep.type === "exam"
                          ? "Volgende stap"
                          : nextStep.type === "completed"
                            ? "Afgerond"
                            : "Jouw huidige module"}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white/68">
                      {moduleOrder ? `Module ${moduleOrder}` : "Jouw traject"} ·{" "}
                      {moduleTitle}
                    </p>
                    <h2 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-[2rem]">
                      {stepTitle}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72 sm:text-[0.95rem]">
                      {stepCopy}
                    </p>
                  </div>

                  <div className="min-w-0 border-white/14 lg:border-l lg:pl-8">
                    {actionSummary ? (
                      <div>
                        <p className="text-sm font-semibold text-white/78">
                          {actionSummary.completed}/{actionSummary.total} opdrachten afgerond
                        </p>
                        <p className="mt-1 text-sm leading-6 text-white/56">
                          {actionSummary.next
                            ? `Volgende actie: ${actionSummary.next}`
                            : "Alle opdrachten bij deze les zijn afgerond."}
                        </p>
                      </div>
                    ) : null}

                    <div className={actionSummary ? "mt-5" : ""}>
                      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-white/56">
                        <span>
                          {nextStep.completedLessons}/{nextStep.totalLessons} lessen
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/18">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <Link
                        href={nextStep.href}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-stone-950 transition hover:bg-white/88 sm:w-auto"
                      >
                        {nextStep.label}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 border-y border-[var(--border)] py-8 lg:grid-cols-[minmax(220px,320px)_minmax(0,680px)] lg:items-center lg:gap-10">
              <div className="max-w-sm">
                <div className="cb-eyebrow">Start hier</div>
                <h2 className="mt-2 cb-section-title">Welkom bij de Academy</h2>
                <p className="mt-2 cb-caption">
                  Bekijk deze korte introductie voordat je verdergaat met je
                  traject.
                </p>
              </div>

              <div className="min-w-0 lg:max-w-[680px]">
                <HomeIntroVideoPlayer
                  playbackId={introVideo.playbackId}
                  title="Introductie tot Coachedby Academy"
                />
              </div>
            </section>

            {visibleModules.length > 0 && (
              <ContentSection
                eyebrow="Jouw traject"
                title="Waar je nu staat"
                description="Je huidige blok en wat daarna volgt."
              >
                <ul className="space-y-3">
                  {visibleModules.map((summary) => (
                    <ModuleRow key={summary.module.id} summary={summary} />
                  ))}
                </ul>
                <Link
                  href="/modules"
                  className="inline-flex text-sm font-semibold text-[var(--foreground)] underline-offset-4 hover:underline"
                >
                  Bekijk alle modules
                </Link>
              </ContentSection>
            )}
          </>
        }
      />
    </div>
  );
}
