import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateMuxTrackSubtitles,
  getDefaultGeneratedSubtitles,
  getMuxAsset,
  getMuxErrorMessage,
  getMuxThumbnailUrl,
  type MuxAsset,
  type MuxAssetTrack,
} from "@/lib/mux";
import { createServiceClient } from "@/lib/supabase/service";
import { queueTranscriptionJob } from "@/lib/transcriptions/jobs";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

type MuxLessonRow = {
  id: number;
  slug: string;
  title: string;
  thumbnail_url: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_playback_policy: "public" | "signed";
};

type BackfillLessonResult = {
  lessonId: number;
  slug: string;
  assetId: string;
  status:
    | "queued_import"
    | "generation_requested"
    | "already_processing"
    | "generation_skipped"
    | "no_audio_track"
    | "asset_not_ready"
    | "failed";
  readyTracks: number;
  pendingTracks: number;
  error?: string;
};

function getWorkerSecret(): string | null {
  return (
    process.env.TRANSCRIPTION_WORKER_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

function getProvidedSecret(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return (
    request.headers.get("x-transcription-worker-secret")?.trim() ||
    request.headers.get("x-cron-secret")?.trim() ||
    null
  );
}

function parseLimit(request: Request): number {
  const raw = Number(new URL(request.url).searchParams.get("limit"));
  if (!Number.isInteger(raw) || raw <= 0) return 25;
  return Math.min(raw, 100);
}

function parseGenerate(request: Request): boolean {
  const value = new URL(request.url).searchParams.get("generate");
  return value !== "false" && value !== "0";
}

function getPlayback(asset: MuxAsset): { id: string; policy: "public" | "signed" } | null {
  const playbacks = asset.playback_ids ?? [];
  return (
    playbacks.find((playback) => playback.policy === "public") ??
    playbacks[0] ??
    null
  );
}

function generatedTextTracks(asset: MuxAsset): MuxAssetTrack[] {
  return (asset.tracks ?? []).filter(
    (track) => track.type === "text" && track.text_source === "generated_vod"
  );
}

function readyGeneratedTextTracks(asset: MuxAsset): MuxAssetTrack[] {
  return generatedTextTracks(asset).filter((track) => track.status === "ready");
}

function pendingGeneratedTextTracks(asset: MuxAsset): MuxAssetTrack[] {
  return generatedTextTracks(asset).filter((track) => track.status === "preparing");
}

function findAudioTrack(asset: MuxAsset): MuxAssetTrack | null {
  return (
    (asset.tracks ?? []).find(
      (track) => track.type === "audio" && (!track.status || track.status === "ready")
    ) ?? null
  );
}

async function updateLessonFromAsset(
  db: SupabaseClient,
  lesson: MuxLessonRow,
  asset: MuxAsset
): Promise<void> {
  const playback = getPlayback(asset);
  const muxStatus =
    asset.status === "ready"
      ? "ready"
      : asset.status === "errored"
        ? "errored"
        : "preparing";

  const update: JsonObject = {
    video_provider: "mux",
    mux_asset_id: asset.id,
    mux_status: muxStatus,
    mux_error_message:
      muxStatus === "errored"
        ? getMuxErrorMessage(asset.errors) ?? "Mux could not process this asset."
        : null,
  };

  if (typeof asset.duration === "number") {
    update.video_duration_seconds = Math.round(asset.duration);
  }

  if (playback) {
    update.video_url = `https://stream.mux.com/${playback.id}.m3u8`;
    update.mux_playback_id = playback.id;
    update.mux_playback_policy = playback.policy;
    if (!lesson.thumbnail_url) {
      update.thumbnail_url = getMuxThumbnailUrl(playback.id);
    }
  }

  await db.from("lessons").update(update).eq("id", lesson.id);
}

async function ensureTranscriptForTrack(
  db: SupabaseClient,
  lesson: MuxLessonRow,
  track: MuxAssetTrack
): Promise<string | null> {
  if (!lesson.mux_asset_id || !track.id) return null;

  const { data: existing } = await db
    .from("lesson_transcripts")
    .select("id")
    .eq("provider", "mux")
    .eq("provider_asset_id", lesson.mux_asset_id)
    .eq("provider_track_id", track.id)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data: inserted, error } = await db
    .from("lesson_transcripts")
    .insert({
      lesson_id: lesson.id,
      provider: "mux",
      provider_asset_id: lesson.mux_asset_id,
      provider_track_id: track.id,
      source_format: "vtt",
      language_code: track.language_code ?? "und",
      status: "queued",
      is_current: false,
      raw_payload: track,
    })
    .select("id")
    .single();

  if (!error && inserted?.id) return String(inserted.id);

  const { data: duplicate } = await db
    .from("lesson_transcripts")
    .select("id")
    .eq("provider", "mux")
    .eq("provider_asset_id", lesson.mux_asset_id)
    .eq("provider_track_id", track.id)
    .maybeSingle();

  return duplicate?.id ? String(duplicate.id) : null;
}

async function queueImportsForReadyTracks(
  db: SupabaseClient,
  lesson: MuxLessonRow,
  tracks: MuxAssetTrack[]
): Promise<number> {
  let queued = 0;

  for (const track of tracks) {
    if (!lesson.mux_asset_id) continue;

    const transcriptId = await ensureTranscriptForTrack(db, lesson, track);
    if (!transcriptId) continue;

    const { error } = await queueTranscriptionJob(db, {
      lessonId: lesson.id,
      transcriptId,
      jobType: "mux_import",
      idempotencyKey: `mux_import:${lesson.mux_asset_id}:${track.id}`,
      payload: {
        source: "backfill",
        assetId: lesson.mux_asset_id,
        trackId: track.id,
        lessonSlug: lesson.slug,
        languageCode: track.language_code ?? null,
      },
    });

    if (!error) queued += 1;
  }

  return queued;
}

async function backfillMuxLesson(
  db: SupabaseClient,
  lesson: MuxLessonRow,
  options: { generateMissing: boolean }
): Promise<BackfillLessonResult> {
  const assetId = lesson.mux_asset_id;
  if (!assetId) {
    return {
      lessonId: lesson.id,
      slug: lesson.slug,
      assetId: "",
      status: "failed",
      readyTracks: 0,
      pendingTracks: 0,
      error: "Lesson has no Mux asset ID.",
    };
  }

  try {
    const asset = await getMuxAsset(assetId);
    const playback = getPlayback(asset);
    const lessonWithFreshPlayback: MuxLessonRow = {
      ...lesson,
      mux_playback_id: lesson.mux_playback_id ?? playback?.id ?? null,
      mux_playback_policy: playback?.policy ?? lesson.mux_playback_policy,
    };

    await updateLessonFromAsset(db, lesson, asset);

    if (asset.status !== "ready") {
      return {
        lessonId: lesson.id,
        slug: lesson.slug,
        assetId,
        status: "asset_not_ready",
        readyTracks: 0,
        pendingTracks: pendingGeneratedTextTracks(asset).length,
      };
    }

    const readyTracks = readyGeneratedTextTracks(asset);
    const pendingTracks = pendingGeneratedTextTracks(asset);
    if (readyTracks.length > 0) {
      const queued = await queueImportsForReadyTracks(
        db,
        lessonWithFreshPlayback,
        readyTracks
      );
      return {
        lessonId: lesson.id,
        slug: lesson.slug,
        assetId,
        status: queued > 0 ? "queued_import" : "already_processing",
        readyTracks: readyTracks.length,
        pendingTracks: pendingTracks.length,
      };
    }

    if (pendingTracks.length > 0) {
      return {
        lessonId: lesson.id,
        slug: lesson.slug,
        assetId,
        status: "already_processing",
        readyTracks: 0,
        pendingTracks: pendingTracks.length,
      };
    }

    const audioTrack = findAudioTrack(asset);
    if (!audioTrack) {
      return {
        lessonId: lesson.id,
        slug: lesson.slug,
        assetId,
        status: "no_audio_track",
        readyTracks: 0,
        pendingTracks: 0,
      };
    }

    if (options.generateMissing) {
      await generateMuxTrackSubtitles({
        assetId,
        trackId: audioTrack.id,
        generatedSubtitles: getDefaultGeneratedSubtitles(),
      });
    }

    return {
      lessonId: lesson.id,
      slug: lesson.slug,
      assetId,
      status: options.generateMissing ? "generation_requested" : "generation_skipped",
      readyTracks: 0,
      pendingTracks: 0,
    };
  } catch (error) {
    return {
      lessonId: lesson.id,
      slug: lesson.slug,
      assetId,
      status: "failed",
      readyTracks: 0,
      pendingTracks: 0,
      error: error instanceof Error ? error.message : "Unknown backfill error",
    };
  }
}

export async function POST(request: Request) {
  const expectedSecret = getWorkerSecret();
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Missing TRANSCRIPTION_WORKER_SECRET or CRON_SECRET" },
      { status: 500 }
    );
  }

  if (getProvidedSecret(request) !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("lessons")
    .select(
      "id, slug, title, thumbnail_url, mux_asset_id, mux_playback_id, mux_playback_policy"
    )
    .not("mux_asset_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(parseLimit(request));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: BackfillLessonResult[] = [];
  for (const lesson of (data ?? []) as MuxLessonRow[]) {
    results.push(
      await backfillMuxLesson(db, lesson, {
        generateMissing: parseGenerate(request),
      })
    );
  }

  return NextResponse.json({
    scanned: results.length,
    queuedImports: results.filter((result) => result.status === "queued_import").length,
    generationRequested: results.filter(
      (result) => result.status === "generation_requested"
    ).length,
    generationSkipped: results.filter(
      (result) => result.status === "generation_skipped"
    ).length,
    alreadyProcessing: results.filter(
      (result) => result.status === "already_processing"
    ).length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  });
}
