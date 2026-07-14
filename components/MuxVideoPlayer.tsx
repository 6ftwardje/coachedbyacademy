"use client";

import MuxPlayer from "@mux/mux-player-react";

const COACHEDBY_RED = "#f50101";

export function MuxVideoPlayer({
  playbackId,
  title,
  onEnded,
  autoPlay = false,
}: {
  playbackId: string;
  title?: string;
  onEnded?: (() => void) | null;
  autoPlay?: boolean;
}) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      videoTitle={title ?? "Lesvideo"}
      className="h-full w-full"
      primaryColor="#ffffff"
      secondaryColor="#0c0a09"
      accentColor={COACHEDBY_RED}
      onEnded={onEnded ?? undefined}
      autoPlay={autoPlay}
      streamType="on-demand"
    />
  );
}
