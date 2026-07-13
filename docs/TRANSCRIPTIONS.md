# Transcription Pipeline

## Phase 1

The database foundation lives in:

`supabase/migrations/20260629000000_lesson_transcriptions.sql`

It adds:

- `lesson_transcripts` for versioned provider transcripts.
- `lesson_transcript_segments` for timestamped transcript cues.
- `content_chunks` for AI-ready retrieval chunks.
- `transcription_jobs` for durable async processing.

Transcript data, chunks, and jobs are admin-only through RLS. Webhooks and workers use the service-role client server-side.

## Mux Uploads

New Mux direct uploads request generated subtitles by default through:

- `MUX_GENERATED_SUBTITLE_LANGUAGE_CODE`, default `nl`
- `MUX_GENERATED_SUBTITLE_NAME`, default `Nederlands (auto)`

This is wired in `lib/mux.ts` via `new_asset_settings.inputs[0].generated_subtitles`.

## Mux Webhook

Configure the Mux webhook endpoint as:

`POST /api/webhooks/mux`

Required env var:

`MUX_WEBHOOK_SECRET`

The route verifies the `mux-signature` header before processing events.

Handled events:

- `video.asset.ready`: syncs lesson video metadata from the Mux asset.
- `video.asset.errored`: marks the lesson Mux state as errored.
- `video.asset.track.ready`: creates or resolves a queued Mux transcript record and enqueues a `mux_import` job.
- `video.asset.track.errored`: records a failed transcript when the generated text track fails.

Unknown events are acknowledged and ignored.

## Next Phase

The worker/importer endpoint is:

`POST /api/jobs/transcriptions`

Required env var:

`TRANSCRIPTION_WORKER_SECRET`

You can pass the secret as either:

- `Authorization: Bearer <secret>`
- `x-transcription-worker-secret: <secret>`

Optional query param:

`?limit=5`

The worker currently handles `mux_import` jobs. It atomically claims jobs through `claim_transcription_jobs(...)`, fetches the Mux VTT file, parses timestamped segments, stores normalized transcript text, marks the current transcript for the lesson/language, and creates pending `content_chunks`.

## Existing Lesson Backfill

Existing Mux lessons need a scan because their upload webhooks already happened before this pipeline existed.

Backfill endpoint:

`POST /api/jobs/transcriptions/backfill`

It uses the same `TRANSCRIPTION_WORKER_SECRET` as the worker.

Dry run style scan without requesting new Mux generated subtitles:

`POST /api/jobs/transcriptions/backfill?generate=false&limit=25`

Real backfill:

`POST /api/jobs/transcriptions/backfill?generate=true&limit=25`

For each existing lesson with `mux_asset_id`, the backfill:

- Fetches the Mux asset and syncs lesson playback metadata.
- Queues `mux_import` jobs for ready generated text tracks.
- Detects generated tracks that are still preparing.
- Requests generated subtitles on the ready audio track when no generated text track exists.

After `generation_requested`, wait for Mux `video.asset.track.ready` or run the backfill endpoint later again. Then run:

`POST /api/jobs/transcriptions`

to import ready queued transcript jobs.

Still to build:

1. Add a scheduled trigger for `POST /api/jobs/transcriptions`.
2. Add admin observability for transcript/job status.
3. Add embedding generation for pending `content_chunks`.
4. Add signed playback token support if Mux lessons move from public to signed playback.
