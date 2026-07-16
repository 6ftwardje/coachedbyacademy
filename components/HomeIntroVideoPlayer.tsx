"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

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
  const [playing, setPlaying] = useState(false);

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

  if (!playing) {
    const posterUrl = `https://image.mux.com/${encodeURIComponent(
      playbackId
    )}/thumbnail.webp?time=1&width=1280&height=720&fit_mode=preserve`;

    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-stone-950 shadow-[0_16px_42px_rgba(28,25,23,0.12)]">
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-contain bg-center bg-no-repeat text-white"
          style={{ backgroundImage: `url("${posterUrl}")` }}
          aria-label={`Speel ${title}`}
        >
          <span className="absolute inset-0 bg-stone-950/35 transition-colors group-hover:bg-stone-950/25" />
          <span className="relative flex flex-col items-center gap-3">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-white text-xl text-stone-950 shadow-lg transition-transform group-hover:scale-105"
              aria-hidden="true"
            >
              ▶
            </span>
            <span className="text-sm font-bold">Introductie afspelen</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-stone-950 shadow-[0_16px_42px_rgba(28,25,23,0.12)]">
      <MuxVideoPlayer playbackId={playbackId} title={title} autoPlay />
    </div>
  );
}
