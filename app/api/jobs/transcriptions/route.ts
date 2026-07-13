import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  claimTranscriptionJobs,
  completeTranscriptionJob,
  failTranscriptionJob,
} from "@/lib/transcriptions/jobs";
import {
  PermanentTranscriptionJobError,
  processTranscriptionJob,
} from "@/lib/transcriptions/processor";

export const runtime = "nodejs";

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
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get("limit"));
  if (!Number.isInteger(raw) || raw <= 0) return 5;
  return Math.min(raw, 10);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown transcription worker error";
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
  const workerId = `transcription-worker:${randomUUID()}`;
  const claimed = await claimTranscriptionJobs(db, {
    workerId,
    jobTypes: ["mux_import"],
    limit: parseLimit(request),
  });

  if (claimed.error) {
    return NextResponse.json({ error: claimed.error }, { status: 500 });
  }

  const results: Array<{
    jobId: string;
    jobType: string;
    status: "succeeded" | "failed";
    transcriptId?: string;
    segmentCount?: number;
    chunkCount?: number;
    error?: string;
  }> = [];

  for (const job of claimed.jobs) {
    try {
      const result = await processTranscriptionJob(db, job);
      await completeTranscriptionJob(db, job.id);
      results.push({
        jobId: job.id,
        jobType: job.job_type,
        status: "succeeded",
        transcriptId: result.transcriptId,
        segmentCount: result.segmentCount,
        chunkCount: result.chunkCount,
      });
    } catch (error) {
      const permanent = error instanceof PermanentTranscriptionJobError;
      await failTranscriptionJob(db, job, {
        error: errorMessage(error),
        retryable: !permanent,
      });
      results.push({
        jobId: job.id,
        jobType: job.job_type,
        status: "failed",
        error: errorMessage(error),
      });
    }
  }

  return NextResponse.json({
    workerId,
    claimed: claimed.jobs.length,
    succeeded: results.filter((result) => result.status === "succeeded").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  });
}
