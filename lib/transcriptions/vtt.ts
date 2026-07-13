export type TranscriptSegmentInput = {
  segment_index: number;
  start_ms: number | null;
  end_ms: number | null;
  speaker: string | null;
  text: string;
};

const TIMING_SEPARATOR = "-->";

function parseTimestamp(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const secondsPart = parts.at(-1);
  const minutesPart = parts.at(-2);
  const hoursPart = parts.length === 3 ? parts[0] : "0";
  if (!secondsPart || !minutesPart || hoursPart === undefined) return null;

  const seconds = Number(secondsPart);
  const minutes = Number(minutesPart);
  const hours = Number(hoursPart);

  if (![seconds, minutes, hours].every(Number.isFinite)) return null;

  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
}

function stripCueMarkup(value: string): string {
  return value
    .replace(/<v\s+([^>]+)>/gi, "$1: ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSpeaker(text: string): { speaker: string | null; text: string } {
  const match = text.match(/^([A-Za-zÀ-ÖØ-öø-ÿ0-9 _.-]{1,48}):\s+(.+)$/);
  if (!match) return { speaker: null, text };
  return { speaker: match[1].trim(), text: match[2].trim() };
}

function parseTimingLine(line: string): {
  start_ms: number | null;
  end_ms: number | null;
} | null {
  if (!line.includes(TIMING_SEPARATOR)) return null;

  const [startRaw, endRaw] = line.split(TIMING_SEPARATOR);
  const endWithoutSettings = endRaw?.trim().split(/\s+/)[0] ?? "";
  const start_ms = parseTimestamp(startRaw ?? "");
  const end_ms = parseTimestamp(endWithoutSettings);

  if (start_ms === null && end_ms === null) return null;
  return { start_ms, end_ms };
}

export function parseWebVtt(vtt: string): TranscriptSegmentInput[] {
  const blocks = vtt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/);

  const segments: TranscriptSegmentInput[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;
    if (/^WEBVTT/i.test(lines[0])) continue;
    if (/^(NOTE|STYLE|REGION)(\s|$)/i.test(lines[0])) continue;

    const timingIndex = lines.findIndex((line) => line.includes(TIMING_SEPARATOR));
    if (timingIndex < 0) continue;

    const timing = parseTimingLine(lines[timingIndex]);
    if (!timing) continue;

    const text = stripCueMarkup(lines.slice(timingIndex + 1).join(" "));
    if (!text) continue;

    const speaker = parseSpeaker(text);
    segments.push({
      segment_index: segments.length,
      start_ms: timing.start_ms,
      end_ms: timing.end_ms,
      speaker: speaker.speaker,
      text: speaker.text,
    });
  }

  return segments;
}

export function normalizeTranscriptText(segments: TranscriptSegmentInput[]): string {
  return segments
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
