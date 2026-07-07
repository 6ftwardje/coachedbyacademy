"use client";

import { useEffect, useState } from "react";
import MuxVideo from "@mux/mux-video/react";

export function MuxBackgroundVideo({
  playbackId,
}: {
  playbackId: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <MuxVideo
      playbackId={playbackId}
      streamType="on-demand"
      autoplay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      className="block h-full w-full origin-center translate-x-[6%] scale-[1.38] object-cover"
      disablePictureInPicture
      disableRemotePlayback
    />
  );
}
