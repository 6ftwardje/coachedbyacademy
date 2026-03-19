"use client";

import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo";

type Props = {
  videoUrl: string | null;
  videoProvider?: string;
  title?: string;
};

export function VimeoPlayer({
  videoUrl,
  videoProvider = "vimeo",
  title,
}: Props) {
  const canUseVimeo =
    videoProvider === "vimeo" && videoUrl && videoUrl.trim().length > 0;
  const videoId = canUseVimeo ? extractVimeoId(videoUrl) : null;

  if (!videoId) {
    return (
      <div className="aspect-video w-full rounded-2xl border border-stone-200 bg-stone-100 flex items-center justify-center">
        <p className="text-stone-500 text-sm px-4 text-center">
          No video available for this lesson.
        </p>
      </div>
    );
  }

  const embedUrl = getVimeoEmbedUrl(videoId);

  return (
    <div className="aspect-video w-full rounded-2xl border border-stone-200 overflow-hidden bg-stone-900">
      <iframe
        src={embedUrl}
        title={title ?? "Lesson video"}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
