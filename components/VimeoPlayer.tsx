"use client";

import dynamic from "next/dynamic";
import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo";
import { useEffect, useMemo, useRef, useState } from "react";

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

type Props = {
  videoUrl: string | null;
  videoProvider?: string;
  muxPlaybackId?: string | null;
  muxPlaybackPolicy?: "public" | "signed";
  title?: string;
  onEnded?: (() => void) | null;
  deferMuxUntilPlay?: boolean;
};

function extractMuxPlaybackId(
  videoUrl: string | null,
  muxPlaybackId?: string | null
): string | null {
  if (muxPlaybackId?.trim()) return muxPlaybackId.trim();
  if (!videoUrl) return null;

  const trimmed = videoUrl.trim();
  if (!trimmed) return null;

  const streamUrl = /stream\.mux\.com\/([^/?#]+)\.m3u8/i.exec(trimmed);
  if (streamUrl?.[1]) return streamUrl[1];

  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}

export function VimeoPlayer({
  videoUrl,
  videoProvider = "vimeo",
  muxPlaybackId,
  muxPlaybackPolicy = "public",
  title,
  onEnded = null,
  deferMuxUntilPlay = false,
}: Props) {
  const [muxStarted, setMuxStarted] = useState(false);
  const muxId =
    videoProvider === "mux" ? extractMuxPlaybackId(videoUrl, muxPlaybackId) : null;
  const canUseVimeo =
    videoProvider === "vimeo" && videoUrl && videoUrl.trim().length > 0;
  const videoId = canUseVimeo ? extractVimeoId(videoUrl) : null;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shouldListen = !!onEnded && !!videoId;

  const embedUrl = useMemo(() => {
    if (!videoId) return null;
    let url = getVimeoEmbedUrl(videoId);
    // Enable Vimeo Player API when we need to listen to events.
    if (onEnded) {
      url += url.includes("?") ? "&" : "?";
      url += "api=1";
    }
    return url;
  }, [videoId, onEnded]);

  useEffect(() => {
    if (!shouldListen) return;
    const iframeEl = iframeRef.current;
    if (!iframeEl) return;

    let player: any = null;
    let cancelled = false;

    async function loadAndBind() {
      const w = window as any;
      if (!w.Vimeo?.Player) {
        const scriptId = "vimeo-player-api";
        const existing = document.getElementById(scriptId);
        if (!existing) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://player.vimeo.com/api/player.js";
          script.async = true;
          document.body.appendChild(script);
          await new Promise<void>((resolve) => {
            script.addEventListener("load", () => resolve(), { once: true });
            script.addEventListener("error", () => resolve(), { once: true });
          });
        }
      }
      if (cancelled) return;
      const Player = (window as any).Vimeo?.Player;
      if (!Player) return;
      player = new Player(iframeEl);
      player.on("ended", onEnded);
    }

    loadAndBind();

    return () => {
      cancelled = true;
      if (player) {
        try {
          player.off("ended", onEnded);
          player.destroy();
        } catch {
          // ignore teardown errors
        }
      }
    };
  }, [onEnded, shouldListen, videoId]);

  if (muxId && muxPlaybackPolicy === "public") {
    if (deferMuxUntilPlay && !muxStarted) {
      const posterUrl = `https://image.mux.com/${encodeURIComponent(
        muxId
      )}/thumbnail.webp?time=1&width=1280&fit_mode=smartcrop`;

      return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[color-mix(in_oklab,#f50101_34%,var(--border)_66%)] bg-stone-950 shadow-[0_0_0_1px_rgba(245,1,1,0.06),0_16px_42px_rgba(28,25,23,0.14)]">
          <button
            type="button"
            onClick={() => setMuxStarted(true)}
            className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-cover bg-center text-white"
            style={{ backgroundImage: `url("${posterUrl}")` }}
            aria-label={`Speel ${title ?? "lesvideo"}`}
          >
            <span className="absolute inset-0 bg-stone-950/35 transition-colors group-hover:bg-stone-950/25" />
            <span className="relative flex flex-col items-center gap-3">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-white text-xl text-stone-950 shadow-lg transition-transform group-hover:scale-105"
                aria-hidden="true"
              >
                ▶
              </span>
              <span className="text-sm font-bold">Lesvideo afspelen</span>
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[color-mix(in_oklab,#f50101_34%,var(--border)_66%)] bg-stone-950 shadow-[0_0_0_1px_rgba(245,1,1,0.06),0_16px_42px_rgba(28,25,23,0.14)]">
        <MuxVideoPlayer
          playbackId={muxId}
          title={title}
          onEnded={onEnded ?? undefined}
          autoPlay={deferMuxUntilPlay}
        />
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="aspect-video w-full rounded-2xl border border-stone-200 bg-stone-100 flex items-center justify-center">
        <p className="text-stone-500 text-sm px-4 text-center">
          Er is nog geen video beschikbaar voor deze les.
        </p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-2xl border border-stone-200 overflow-hidden bg-stone-900">
      <iframe
        ref={iframeRef}
        src={embedUrl ?? undefined}
        title={title ?? "Lesvideo"}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
