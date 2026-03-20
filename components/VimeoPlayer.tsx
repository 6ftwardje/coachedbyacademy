"use client";

import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  videoUrl: string | null;
  videoProvider?: string;
  title?: string;
  onEnded?: (() => void) | null;
};

export function VimeoPlayer({
  videoUrl,
  videoProvider = "vimeo",
  title,
  onEnded = null,
}: Props) {
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

  if (!videoId) {
    return (
      <div className="aspect-video w-full rounded-2xl border border-stone-200 bg-stone-100 flex items-center justify-center">
        <p className="text-stone-500 text-sm px-4 text-center">
          No video available for this lesson.
        </p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-2xl border border-stone-200 overflow-hidden bg-stone-900">
      <iframe
        ref={iframeRef}
        src={embedUrl ?? undefined}
        title={title ?? "Lesson video"}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
