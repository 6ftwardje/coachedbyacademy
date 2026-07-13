"use client";

import dynamic from "next/dynamic";

const MuxVideoPlayer = dynamic(
  () => import("@/components/MuxVideoPlayer").then((mod) => mod.MuxVideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-stone-950">
        <span className="text-sm font-medium text-white/70">Video laden...</span>
      </div>
    ),
  }
);

export function HomeIntroVideoPlayer({
  playbackId,
  title,
}: {
  playbackId: string | null;
  title: string;
}) {
  if (!playbackId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-stone-100 shadow-[0_16px_42px_rgba(28,25,23,0.08)] dark:bg-stone-900">
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <p className="max-w-sm text-sm font-medium leading-6 text-[var(--muted)]">
            De introductievideo wordt voorbereid en verschijnt hier zodra Mux
            klaar is.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-stone-950 shadow-[0_16px_42px_rgba(28,25,23,0.12)]">
      <MuxVideoPlayer playbackId={playbackId} title={title} />
    </div>
  );
}
