import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMuxErrorMessage, getMuxThumbnailUrl } from "@/lib/mux";
import { createServiceClient } from "@/lib/supabase/service";
import { queueTranscriptionJob } from "@/lib/transcriptions/jobs";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

type MuxWebhookEvent = {
  id?: string;
  type?: string;
  created_at?: string | number;
  data?: JsonObject;
};

type LessonVideoRow = {
  id: number;
  slug: string;
  thumbnail_url: string | null;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function parsePassthroughLessonId(value: unknown): number | null {
  const text = readString(value);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as { lessonId?: unknown };
    const lessonId = Number(parsed.lessonId);
    return Number.isInteger(lessonId) && lessonId > 0 ? lessonId : null;
  } catch {
    return null;
  }
}

function parseMuxSignatureHeader(header: string): {
  timestamp: number;
  signatures: string[];
} | null {
  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);
  const timestamp = Number(timestampPart?.slice(2));

  if (!Number.isFinite(timestamp) || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function verifyMuxSignature({
  rawBody,
  signatureHeader,
  secret,
}: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!signatureHeader) return false;

  const parsed = parseMuxSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - parsed.timestamp);
  if (ageSeconds > 300) return false;

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return parsed.signatures.some((signature) => safeEqualHex(signature, expected));
}

function getPlayback(data: JsonObject): { id: string; policy: "public" | "signed" } | null {
  const playbackIds = Array.isArray(data.playback_ids) ? data.playback_ids : [];
  const playbacks = playbackIds
    .map((item) => readObject(item))
    .filter((item): item is JsonObject => Boolean(item))
    .map((item) => ({
      id: readString(item.id),
      policy: item.policy === "signed" ? "signed" : "public",
    }))
    .filter((item): item is { id: string; policy: "public" | "signed" } => Boolean(item.id));

  return playbacks.find((playback) => playback.policy === "public") ?? playbacks[0] ?? null;
}

function getErrorMessage(data: JsonObject): string | null {
  const errors = readObject(data.errors) ?? readObject(data.error);
  if (!errors) return null;

  const messages = Array.isArray(errors.messages)
    ? errors.messages.filter((message): message is string => typeof message === "string")
    : undefined;

  return getMuxErrorMessage({
    type: readString(errors.type) ?? undefined,
    messages,
  });
}

async function findLessonForAsset(
  db: SupabaseClient,
  data: JsonObject
): Promise<LessonVideoRow | null> {
  const assetId = readString(data.id);
  const passthroughLessonId = parsePassthroughLessonId(data.passthrough);

  if (assetId) {
    const { data: lesson } = await db
      .from("lessons")
      .select("id, slug, thumbnail_url")
      .eq("mux_asset_id", assetId)
      .maybeSingle();
    if (lesson) return lesson as LessonVideoRow;
  }

  if (passthroughLessonId) {
    const { data: lesson } = await db
      .from("lessons")
      .select("id, slug, thumbnail_url")
      .eq("id", passthroughLessonId)
      .maybeSingle();
    if (lesson) return lesson as LessonVideoRow;
  }

  return null;
}

async function handleAssetEvent(
  db: SupabaseClient,
  event: MuxWebhookEvent,
  data: JsonObject
): Promise<void> {
  const assetId = readString(data.id);
  if (!assetId) return;

  const lesson = await findLessonForAsset(db, data);
  if (!lesson) return;

  const playback = getPlayback(data);
  const eventIsErrored = event.type === "video.asset.errored";
  const muxStatus =
    eventIsErrored || data.status === "errored"
      ? "errored"
      : data.status === "ready" || event.type === "video.asset.ready"
        ? "ready"
        : "preparing";

  const update: JsonObject = {
    video_provider: "mux",
    mux_asset_id: assetId,
    mux_status: muxStatus,
    mux_error_message:
      muxStatus === "errored"
        ? getErrorMessage(data) ?? "Mux could not process this asset."
        : null,
  };

  if (playback) {
    update.video_url = `https://stream.mux.com/${playback.id}.m3u8`;
    update.mux_playback_id = playback.id;
    update.mux_playback_policy = playback.policy;
    if (!lesson.thumbnail_url) {
      update.thumbnail_url = getMuxThumbnailUrl(playback.id);
    }
  }

  const duration = readNumber(data.duration);
  if (duration !== null) update.video_duration_seconds = Math.round(duration);

  await db.from("lessons").update(update).eq("id", lesson.id);
}

async function ensureMuxTranscript(
  db: SupabaseClient,
  lessonId: number,
  data: JsonObject,
  status: "queued" | "failed"
): Promise<string | null> {
  const assetId = readString(data.asset_id);
  const trackId = readString(data.id);
  if (!assetId || !trackId) return null;

  const { data: existing } = await db
    .from("lesson_transcripts")
    .select("id, status")
    .eq("provider", "mux")
    .eq("provider_asset_id", assetId)
    .eq("provider_track_id", trackId)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data: inserted, error } = await db
    .from("lesson_transcripts")
    .insert({
      lesson_id: lessonId,
      provider: "mux",
      provider_asset_id: assetId,
      provider_track_id: trackId,
      source_format: "vtt",
      language_code:
        readString(data.language_code) ?? readString(data.language) ?? "und",
      status,
      is_current: false,
      raw_payload: data,
      error_message: status === "failed" ? getErrorMessage(data) : null,
    })
    .select("id")
    .single();

  if (!error && inserted?.id) return String(inserted.id);

  const { data: duplicate } = await db
    .from("lesson_transcripts")
    .select("id")
    .eq("provider", "mux")
    .eq("provider_asset_id", assetId)
    .eq("provider_track_id", trackId)
    .maybeSingle();

  return duplicate?.id ? String(duplicate.id) : null;
}

async function handleTrackEvent(
  db: SupabaseClient,
  event: MuxWebhookEvent,
  data: JsonObject
): Promise<void> {
  const assetId = readString(data.asset_id);
  const trackId = readString(data.id);
  const textSource = readString(data.text_source);
  if (!assetId || !trackId || textSource !== "generated_vod") return;

  const { data: lesson } = await db
    .from("lessons")
    .select("id, slug")
    .eq("mux_asset_id", assetId)
    .maybeSingle();
  if (!lesson?.id) {
    await queueTranscriptionJob(db, {
      jobType: "mux_import",
      idempotencyKey: `mux_import:${assetId}:${trackId}`,
      payload: {
        eventId: event.id ?? null,
        assetId,
        trackId,
        lessonResolution: "pending",
        languageCode:
          readString(data.language_code) ?? readString(data.language) ?? null,
      },
    });
    return;
  }

  const status = event.type === "video.asset.track.errored" ? "failed" : "queued";
  const transcriptId = await ensureMuxTranscript(
    db,
    Number(lesson.id),
    data,
    status
  );
  if (!transcriptId || status === "failed") return;

  await queueTranscriptionJob(db, {
    lessonId: Number(lesson.id),
    transcriptId,
    jobType: "mux_import",
    idempotencyKey: `mux_import:${assetId}:${trackId}`,
    payload: {
      eventId: event.id ?? null,
      assetId,
      trackId,
      lessonSlug: readString(lesson.slug),
      languageCode:
        readString(data.language_code) ?? readString(data.language) ?? null,
    },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.MUX_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Missing MUX_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const signatureHeader = request.headers.get("mux-signature");
  if (!verifyMuxSignature({ rawBody, signatureHeader, secret })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: MuxWebhookEvent;
  try {
    event = JSON.parse(rawBody) as MuxWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = readObject(event.data);
  if (!event.type || !data) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const db = createServiceClient();

  if (event.type === "video.asset.ready" || event.type === "video.asset.errored") {
    await handleAssetEvent(db, event, data);
  }

  if (
    event.type === "video.asset.track.ready" ||
    event.type === "video.asset.track.errored"
  ) {
    await handleTrackEvent(db, event, data);
  }

  return NextResponse.json({ received: true });
}
