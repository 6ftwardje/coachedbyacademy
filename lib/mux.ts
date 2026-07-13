export type MuxPlaybackPolicy = "public" | "signed";

type MuxGeneratedSubtitle = {
  language_code: string;
  name: string;
};

type MuxUpload = {
  id: string;
  url?: string;
  status?: string;
  asset_id?: string;
  error?: {
    type?: string;
    messages?: string[];
  };
};

export type MuxAssetTrack = {
  id: string;
  type?: "video" | "audio" | "text";
  text_type?: "subtitles" | "captions";
  text_source?: "uploaded" | "generated_vod";
  status?: "preparing" | "ready" | "errored";
  language_code?: string;
  name?: string;
};

export type MuxAsset = {
  id: string;
  status?: "preparing" | "ready" | "errored";
  duration?: number;
  playback_ids?: Array<{
    id: string;
    policy: MuxPlaybackPolicy;
  }>;
  tracks?: MuxAssetTrack[];
  errors?: {
    type?: string;
    messages?: string[];
  };
};

type MuxResponse<T> = {
  data?: T;
  error?: {
    type?: string;
    messages?: string[];
  };
};

type MuxFetchInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

function getMuxAuthHeader(): string {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error("Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET");
  }

  return `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")}`;
}

async function muxFetch<T>(
  path: string,
  init?: MuxFetchInit
): Promise<MuxResponse<T>> {
  const { headers, ...fetchInit } = init ?? {};
  const cache = fetchInit.cache ?? (fetchInit.next ? undefined : "no-store");

  const res = await fetch(`https://api.mux.com${path}`, {
    ...fetchInit,
    cache,
    headers: {
      Authorization: getMuxAuthHeader(),
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => ({}))) as MuxResponse<T>;
  if (!res.ok) {
    const detail =
      json.error?.messages?.join(" ") ||
      json.error?.type ||
      `Mux request failed with status ${res.status}`;
    throw new Error(detail);
  }

  return json;
}

export function getDefaultGeneratedSubtitles(): MuxGeneratedSubtitle[] {
  const languageCode =
    process.env.MUX_GENERATED_SUBTITLE_LANGUAGE_CODE?.trim() || "nl";
  const name =
    process.env.MUX_GENERATED_SUBTITLE_NAME?.trim() ||
    (languageCode === "nl" ? "Nederlands (auto)" : "Auto captions");

  return [{ language_code: languageCode, name }];
}

export async function createMuxDirectUpload({
  lessonId,
  corsOrigin,
  playbackPolicy = "public",
  generatedSubtitles = getDefaultGeneratedSubtitles(),
}: {
  lessonId: number;
  corsOrigin: string;
  playbackPolicy?: MuxPlaybackPolicy;
  generatedSubtitles?: MuxGeneratedSubtitle[];
}): Promise<{ id: string; url: string }> {
  const response = await muxFetch<MuxUpload>("/video/v1/uploads", {
    method: "POST",
    body: JSON.stringify({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policies: [playbackPolicy],
        passthrough: JSON.stringify({ lessonId }),
        inputs:
          generatedSubtitles.length > 0
            ? [{ generated_subtitles: generatedSubtitles }]
            : undefined,
      },
    }),
  });

  const upload = response.data;
  if (!upload?.id || !upload.url) {
    throw new Error("Mux did not return an upload URL.");
  }

  return { id: upload.id, url: upload.url };
}

export async function getMuxUpload(uploadId: string): Promise<MuxUpload> {
  const response = await muxFetch<MuxUpload>(`/video/v1/uploads/${uploadId}`);
  if (!response.data) throw new Error("Mux upload not found.");
  return response.data;
}

export async function getMuxAsset(
  assetId: string,
  init?: MuxFetchInit
): Promise<MuxAsset> {
  const response = await muxFetch<MuxAsset>(
    `/video/v1/assets/${assetId}`,
    init
  );
  if (!response.data) throw new Error("Mux asset not found.");
  return response.data;
}

export async function generateMuxTrackSubtitles({
  assetId,
  trackId,
  generatedSubtitles = getDefaultGeneratedSubtitles(),
}: {
  assetId: string;
  trackId: string;
  generatedSubtitles?: MuxGeneratedSubtitle[];
}): Promise<void> {
  await muxFetch<unknown>(
    `/video/v1/assets/${assetId}/tracks/${trackId}/generate-subtitles`,
    {
      method: "POST",
      body: JSON.stringify({ generated_subtitles: generatedSubtitles }),
    }
  );
}

export function getMuxErrorMessage(
  error?: { type?: string; messages?: string[] } | null
): string | null {
  if (!error) return null;
  return error.messages?.join(" ") || error.type || null;
}

export function getMuxThumbnailUrl(playbackId: string | null): string | null {
  if (!playbackId) return null;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`;
}
