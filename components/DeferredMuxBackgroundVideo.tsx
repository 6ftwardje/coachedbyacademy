"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MuxBackgroundVideo = dynamic(
  () =>
    import("@/components/MuxBackgroundVideo").then(
      (mod) => mod.MuxBackgroundVideo
    ),
  { ssr: false }
);

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

export function DeferredMuxBackgroundVideo({
  playbackId,
}: {
  playbackId: string;
}) {
  const [loadVideo, setLoadVideo] = useState(false);
  const posterUrl = `https://image.mux.com/${encodeURIComponent(
    playbackId
  )}/thumbnail.webp?time=1&width=1600&fit_mode=smartcrop`;

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const saveData = (navigator as NavigatorWithConnection).connection
      ?.saveData;
    if (reduceMotion || saveData) return;

    const timeout = window.setTimeout(() => setLoadVideo(true), 3_000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${posterUrl}")` }}
      />
      {loadVideo && (
        <div className="absolute inset-0">
          <MuxBackgroundVideo playbackId={playbackId} />
        </div>
      )}
    </div>
  );
}
