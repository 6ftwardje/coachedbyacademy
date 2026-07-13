import type { SupabaseClient } from "@supabase/supabase-js";
import type { LessonTranscript, TranscriptionJob } from "@/lib/types";
import { chunkTranscriptSegments, hashText } from "@/lib/transcriptions/chunks";
import {
  normalizeTranscriptText,
  parseWebVtt,
  type TranscriptSegmentInput,
} from "@/lib/transcriptions/vtt";

type JsonObject = Record<string, unknown>;

type LessonMuxRow = {
  id: number;
  slug: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_playback_policy: "public" | "signed";
};

type ProcessorResult = {
  transcriptId?: string;
  segmentCount?: number;
  chunkCount?: number;
};

export class PermanentTranscriptionJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentTranscriptionJobError";
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPayload(job: TranscriptionJob): JsonObject {
  return job.payload && typeof job.payload === "object" && !Array.isArray(job.payload)
    ? job.payload
    : {};
}

async function fetchLessonById(
  db: SupabaseClient,
  lessonId: number
): Promise<LessonMuxRow | null> {
  const { data, error } = await db
    .from("lessons")
    .select("id, slug, mux_asset_id, mux_playback_id, mux_playback_policy")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as LessonMuxRow) : null;
}

async function fetchLessonByAssetId(
  db: SupabaseClient,
  assetId: string
): Promise<LessonMuxRow | null> {
  const { data, error } = await db
    .from("lessons")
    .select("id, slug, mux_asset_id, mux_playback_id, mux_playback_policy")
    .eq("mux_asset_id", assetId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as LessonMuxRow) : null;
}

async function fetchTranscriptById(
  db: SupabaseClient,
  transcriptId: string
): Promise<LessonTranscript | null> {
  const { data, error } = await db
    .from("lesson_transcripts")
    .select("*")
    .eq("id", transcriptId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as LessonTranscript) : null;
}

async function fetchTranscriptByProviderTrack(
  db: SupabaseClient,
  assetId: string,
  trackId: string
): Promise<LessonTranscript | null> {
  const { data, error } = await db
    .from("lesson_transcripts")
    .select("*")
    .eq("provider", "mux")
    .eq("provider_asset_id", assetId)
    .eq("provider_track_id", trackId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as LessonTranscript) : null;
}

async function ensureMuxTranscriptForJob(
  db: SupabaseClient,
  job: TranscriptionJob,
  lesson: LessonMuxRow,
  assetId: string,
  trackId: string
): Promise<LessonTranscript> {
  const existing = await fetchTranscriptByProviderTrack(db, assetId, trackId);
  if (existing) return existing;

  const payload = readPayload(job);
  const { data, error } = await db
    .from("lesson_transcripts")
    .insert({
      lesson_id: lesson.id,
      provider: "mux",
      provider_asset_id: assetId,
      provider_track_id: trackId,
      source_format: "vtt",
      language_code: readString(payload.languageCode) ?? "und",
      status: "queued",
      is_current: false,
      raw_payload: payload,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as LessonTranscript;
}

function getMuxVttUrl(lesson: LessonMuxRow, trackId: string): string {
  if (!lesson.mux_playback_id) {
    throw new Error("Lesson does not have a Mux playback ID yet.");
  }
  if (lesson.mux_playback_policy === "signed") {
    throw new PermanentTranscriptionJobError(
      "Signed Mux transcript imports need playback-token support before they can be processed."
    );
  }
  return `https://stream.mux.com/${lesson.mux_playback_id}/text/${trackId}.vtt`;
}

async function fetchMuxVtt(url: string): Promise<string> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Mux transcript fetch failed with status ${response.status}`);
  }
  return response.text();
}

async function insertBatches(
  db: SupabaseClient,
  table: string,
  rows: JsonObject[],
  batchSize = 500
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await db.from(table).insert(batch);
    if (error) throw new Error(error.message);
  }
}

async function persistTranscriptImport({
  db,
  transcript,
  lesson,
  rawVtt,
  segments,
}: {
  db: SupabaseClient;
  transcript: LessonTranscript;
  lesson: LessonMuxRow;
  rawVtt: string;
  segments: TranscriptSegmentInput[];
}): Promise<ProcessorResult> {
  const normalizedText = normalizeTranscriptText(segments);
  const transcriptHash = normalizedText ? hashText(normalizedText) : hashText(rawVtt);
  const chunks = normalizedText ? chunkTranscriptSegments(segments) : [];
  const now = new Date().toISOString();

  await db
    .from("lesson_transcripts")
    .update({ status: "processing", error_message: null })
    .eq("id", transcript.id);

  await db.from("content_chunks").delete().eq("transcript_id", transcript.id);
  await db.from("lesson_transcript_segments").delete().eq("transcript_id", transcript.id);

  if (segments.length > 0) {
    await insertBatches(
      db,
      "lesson_transcript_segments",
      segments.map((segment) => ({
        transcript_id: transcript.id,
        lesson_id: lesson.id,
        segment_index: segment.segment_index,
        start_ms: segment.start_ms,
        end_ms: segment.end_ms,
        speaker: segment.speaker,
        text: segment.text,
      }))
    );
  }

  if (chunks.length > 0) {
    await insertBatches(
      db,
      "content_chunks",
      chunks.map((chunk) => ({
        lesson_id: lesson.id,
        transcript_id: transcript.id,
        source_type: "transcript",
        chunk_index: chunk.chunk_index,
        text: chunk.text,
        token_count: chunk.token_count,
        content_hash: chunk.content_hash,
        metadata: {
          ...chunk.metadata,
          provider: "mux",
          language_code: transcript.language_code,
          lesson_slug: lesson.slug,
        },
        embedding_status: "pending",
      }))
    );
  }

  if (normalizedText) {
    await db
      .from("lesson_transcripts")
      .update({
        is_current: false,
        status: "superseded",
        superseded_at: now,
      })
      .eq("lesson_id", lesson.id)
      .eq("language_code", transcript.language_code)
      .eq("is_current", true)
      .neq("id", transcript.id);
  }

  const { error } = await db
    .from("lesson_transcripts")
    .update({
      raw_text: rawVtt,
      normalized_text: normalizedText || null,
      content_hash: transcriptHash,
      status: normalizedText ? "ready" : "ready_empty",
      is_current: Boolean(normalizedText),
      error_message: null,
      imported_at: now,
    })
    .eq("id", transcript.id);

  if (error) throw new Error(error.message);

  return {
    transcriptId: transcript.id,
    segmentCount: segments.length,
    chunkCount: chunks.length,
  };
}

async function processMuxImport(
  db: SupabaseClient,
  job: TranscriptionJob
): Promise<ProcessorResult> {
  const payload = readPayload(job);
  const payloadAssetId = readString(payload.assetId);
  const payloadTrackId = readString(payload.trackId);

  let transcript = job.transcript_id
    ? await fetchTranscriptById(db, job.transcript_id)
    : null;
  if (!transcript && payloadAssetId && payloadTrackId) {
    transcript = await fetchTranscriptByProviderTrack(db, payloadAssetId, payloadTrackId);
  }

  const assetId = transcript?.provider_asset_id ?? payloadAssetId;
  const trackId = transcript?.provider_track_id ?? payloadTrackId;
  if (!assetId || !trackId) {
    throw new PermanentTranscriptionJobError("Mux import job is missing assetId or trackId.");
  }

  const lesson =
    (job.lesson_id ? await fetchLessonById(db, job.lesson_id) : null) ??
    (transcript?.lesson_id ? await fetchLessonById(db, transcript.lesson_id) : null) ??
    (await fetchLessonByAssetId(db, assetId));

  if (!lesson) {
    throw new Error("Lesson for Mux asset is not available yet.");
  }

  transcript = transcript ?? (await ensureMuxTranscriptForJob(db, job, lesson, assetId, trackId));

  if (job.lesson_id !== lesson.id || job.transcript_id !== transcript.id) {
    await db
      .from("transcription_jobs")
      .update({ lesson_id: lesson.id, transcript_id: transcript.id })
      .eq("id", job.id);
  }

  const rawVtt = await fetchMuxVtt(getMuxVttUrl(lesson, trackId));
  const segments = parseWebVtt(rawVtt);

  return persistTranscriptImport({
    db,
    transcript,
    lesson,
    rawVtt,
    segments,
  });
}

export async function processTranscriptionJob(
  db: SupabaseClient,
  job: TranscriptionJob
): Promise<ProcessorResult> {
  if (job.job_type === "mux_import") {
    return processMuxImport(db, job);
  }

  throw new PermanentTranscriptionJobError(
    `Unsupported transcription job type: ${job.job_type}`
  );
}
