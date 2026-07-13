import type { SupabaseClient } from "@supabase/supabase-js";
import type { TranscriptionJob, TranscriptionJobType } from "@/lib/types";

type QueueTranscriptionJobInput = {
  lessonId?: number | null;
  transcriptId?: string | null;
  jobType: TranscriptionJobType;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  priority?: number;
  runAfter?: string;
};

export async function queueTranscriptionJob(
  db: SupabaseClient,
  input: QueueTranscriptionJobInput
): Promise<{ error: string | null }> {
  const { error } = await db.from("transcription_jobs").upsert(
    {
      lesson_id: input.lessonId ?? null,
      transcript_id: input.transcriptId ?? null,
      job_type: input.jobType,
      status: "queued",
      priority: input.priority ?? 0,
      run_after: input.runAfter ?? new Date().toISOString(),
      payload: input.payload ?? {},
      idempotency_key: input.idempotencyKey,
    },
    {
      onConflict: "idempotency_key",
      ignoreDuplicates: true,
    }
  );

  return { error: error?.message ?? null };
}

export async function claimTranscriptionJobs(
  db: SupabaseClient,
  input: {
    workerId: string;
    jobTypes?: TranscriptionJobType[];
    limit?: number;
  }
): Promise<{ jobs: TranscriptionJob[]; error: string | null }> {
  const { data, error } = await db.rpc("claim_transcription_jobs", {
    p_worker_id: input.workerId,
    p_job_types: input.jobTypes ?? null,
    p_limit: input.limit ?? 5,
  });

  return {
    jobs: error ? [] : ((data ?? []) as TranscriptionJob[]),
    error: error?.message ?? null,
  };
}

export async function completeTranscriptionJob(
  db: SupabaseClient,
  jobId: string
): Promise<void> {
  await db
    .from("transcription_jobs")
    .update({
      status: "succeeded",
      locked_at: null,
      locked_by: null,
      last_error: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function failTranscriptionJob(
  db: SupabaseClient,
  job: Pick<TranscriptionJob, "id" | "attempts" | "max_attempts">,
  input: {
    error: string;
    retryable?: boolean;
  }
): Promise<void> {
  const retryable = input.retryable ?? true;
  const hasAttemptsLeft = job.attempts < job.max_attempts;
  const status = retryable && hasAttemptsLeft ? "failed" : "dead";
  const retryDelaySeconds = Math.min(60 * 30, 15 * 2 ** Math.max(job.attempts - 1, 0));
  const runAfter = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();

  await db
    .from("transcription_jobs")
    .update({
      status,
      locked_at: null,
      locked_by: null,
      last_error: input.error,
      run_after: status === "failed" ? runAfter : new Date().toISOString(),
      finished_at: status === "dead" ? new Date().toISOString() : null,
    })
    .eq("id", job.id);
}
