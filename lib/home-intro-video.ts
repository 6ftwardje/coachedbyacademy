import { getMuxAsset } from "@/lib/mux";

export const HOME_INTRO_VIDEO_ASSET_ID =
  "3QJKuyc71KvhdJu5hdT1v2ZUNYVYpeQKw76nea01klFQ";

const HOME_INTRO_VIDEO_PLAYBACK_ID =
  process.env.HOME_INTRO_MUX_PLAYBACK_ID?.trim() ||
  process.env.NEXT_PUBLIC_HOME_INTRO_MUX_PLAYBACK_ID?.trim() ||
  null;

export type HomeIntroVideo = {
  assetId: string;
  playbackId: string | null;
  isReady: boolean;
};

export async function getHomeIntroVideo(): Promise<HomeIntroVideo> {
  if (HOME_INTRO_VIDEO_PLAYBACK_ID) {
    return {
      assetId: HOME_INTRO_VIDEO_ASSET_ID,
      playbackId: HOME_INTRO_VIDEO_PLAYBACK_ID,
      isReady: true,
    };
  }

  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    return {
      assetId: HOME_INTRO_VIDEO_ASSET_ID,
      playbackId: null,
      isReady: false,
    };
  }

  try {
    const asset = await getMuxAsset(HOME_INTRO_VIDEO_ASSET_ID, {
      next: { revalidate: 60 * 60 },
    });
    const publicPlayback = asset.playback_ids?.find(
      (playback) => playback.policy === "public"
    );

    return {
      assetId: HOME_INTRO_VIDEO_ASSET_ID,
      playbackId:
        asset.status === "ready" && publicPlayback ? publicPlayback.id : null,
      isReady: asset.status === "ready" && !!publicPlayback,
    };
  } catch (error) {
    console.error("getHomeIntroVideo", error);
    return {
      assetId: HOME_INTRO_VIDEO_ASSET_ID,
      playbackId: null,
      isReady: false,
    };
  }
}
