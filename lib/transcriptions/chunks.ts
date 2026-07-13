import { createHash } from "node:crypto";
import type { TranscriptSegmentInput } from "@/lib/transcriptions/vtt";

export type ContentChunkInput = {
  chunk_index: number;
  text: string;
  token_count: number;
  content_hash: string;
  metadata: Record<string, unknown>;
};

const DEFAULT_MAX_WORDS = 360;
const DEFAULT_OVERLAP_WORDS = 50;

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.35);
}

function segmentRangeMetadata(segments: TranscriptSegmentInput[]) {
  const starts = segments
    .map((segment) => segment.start_ms)
    .filter((value): value is number => typeof value === "number");
  const ends = segments
    .map((segment) => segment.end_ms)
    .filter((value): value is number => typeof value === "number");

  return {
    start_ms: starts.length > 0 ? Math.min(...starts) : null,
    end_ms: ends.length > 0 ? Math.max(...ends) : null,
    segment_start_index: segments[0]?.segment_index ?? null,
    segment_end_index: segments.at(-1)?.segment_index ?? null,
  };
}

export function chunkTranscriptSegments(
  segments: TranscriptSegmentInput[],
  options?: { maxWords?: number; overlapWords?: number }
): ContentChunkInput[] {
  const maxWords = options?.maxWords ?? DEFAULT_MAX_WORDS;
  const overlapWords = Math.min(options?.overlapWords ?? DEFAULT_OVERLAP_WORDS, maxWords - 1);
  const chunks: ContentChunkInput[] = [];
  let currentSegments: TranscriptSegmentInput[] = [];
  let currentWords = 0;

  function pushChunk() {
    if (currentSegments.length === 0) return;

    const text = currentSegments
      .map((segment) => segment.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;

    chunks.push({
      chunk_index: chunks.length,
      text,
      token_count: estimateTokenCount(text),
      content_hash: hashText(text),
      metadata: segmentRangeMetadata(currentSegments),
    });
  }

  for (const segment of segments) {
    const words = segment.text.split(/\s+/).filter(Boolean).length;
    if (currentSegments.length > 0 && currentWords + words > maxWords) {
      pushChunk();

      const overlap: TranscriptSegmentInput[] = [];
      let overlapCount = 0;
      for (let i = currentSegments.length - 1; i >= 0; i -= 1) {
        const candidate = currentSegments[i];
        const candidateWords = candidate.text.split(/\s+/).filter(Boolean).length;
        if (overlapCount + candidateWords > overlapWords) break;
        overlap.unshift(candidate);
        overlapCount += candidateWords;
      }

      currentSegments = overlap;
      currentWords = overlapCount;
    }

    currentSegments.push(segment);
    currentWords += words;
  }

  pushChunk();
  return chunks;
}
