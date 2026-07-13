-- Persist lesson transcriptions and prepare normalized chunks for AI context.

create table if not exists public.lesson_transcripts (
  id uuid primary key default gen_random_uuid(),
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  provider text not null default 'mux',
  provider_asset_id text,
  provider_track_id text,
  source_format text not null default 'vtt',
  language_code text not null default 'und',
  language_confidence real check (
    language_confidence is null
    or (language_confidence >= 0 and language_confidence <= 1)
  ),
  status text not null default 'queued',
  is_current boolean not null default false,
  raw_text text,
  normalized_text text,
  raw_payload jsonb not null default '{}'::jsonb,
  content_hash text,
  error_message text,
  generated_at timestamptz,
  imported_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lesson_transcripts drop constraint if exists lesson_transcripts_provider_check;
alter table public.lesson_transcripts add constraint lesson_transcripts_provider_check
  check (provider in ('mux', 'vimeo', 'manual', 'import'));

alter table public.lesson_transcripts drop constraint if exists lesson_transcripts_source_format_check;
alter table public.lesson_transcripts add constraint lesson_transcripts_source_format_check
  check (source_format in ('vtt', 'srt', 'txt', 'json', 'unknown'));

alter table public.lesson_transcripts drop constraint if exists lesson_transcripts_status_check;
alter table public.lesson_transcripts add constraint lesson_transcripts_status_check
  check (status in ('queued', 'processing', 'ready', 'ready_empty', 'failed', 'superseded'));

drop trigger if exists set_lesson_transcripts_updated_at on public.lesson_transcripts;
create trigger set_lesson_transcripts_updated_at
  before update on public.lesson_transcripts
  for each row
  execute function public.set_updated_at();

create unique index if not exists lesson_transcripts_provider_track_unique
  on public.lesson_transcripts (provider, provider_asset_id, provider_track_id)
  where provider_asset_id is not null and provider_track_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_transcripts_id_lesson_id_unique'
      and conrelid = 'public.lesson_transcripts'::regclass
  ) then
    alter table public.lesson_transcripts add constraint lesson_transcripts_id_lesson_id_unique
      unique (id, lesson_id);
  end if;
end;
$$;

create unique index if not exists lesson_transcripts_current_language_unique
  on public.lesson_transcripts (lesson_id, language_code)
  where is_current = true;

create index if not exists idx_lesson_transcripts_lesson_id
  on public.lesson_transcripts (lesson_id);

create index if not exists idx_lesson_transcripts_status
  on public.lesson_transcripts (status)
  where status in ('queued', 'processing', 'failed');

create index if not exists idx_lesson_transcripts_provider_asset
  on public.lesson_transcripts (provider, provider_asset_id)
  where provider_asset_id is not null;

-- Cue-level transcript rows keep timestamps available for AI citations.
create table if not exists public.lesson_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  segment_index integer not null check (segment_index >= 0),
  start_ms integer check (start_ms is null or start_ms >= 0),
  end_ms integer check (end_ms is null or end_ms >= 0),
  speaker text,
  text text not null,
  created_at timestamptz not null default now(),
  check (
    start_ms is null
    or end_ms is null
    or end_ms >= start_ms
  ),
  constraint lesson_transcript_segments_transcript_lesson_fk
    foreign key (transcript_id, lesson_id)
    references public.lesson_transcripts (id, lesson_id)
    on delete cascade
);

create unique index if not exists lesson_transcript_segments_order_unique
  on public.lesson_transcript_segments (transcript_id, segment_index);

create index if not exists idx_lesson_transcript_segments_lesson_start
  on public.lesson_transcript_segments (lesson_id, start_ms);

create index if not exists idx_lesson_transcript_segments_transcript_id
  on public.lesson_transcript_segments (transcript_id);

-- Normalized chunks are the stable input for retrieval and later embeddings.
create table if not exists public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  lesson_id bigint references public.lessons (id) on delete cascade,
  transcript_id uuid,
  source_type text not null,
  chunk_index integer not null check (chunk_index >= 0),
  text text not null,
  token_count integer check (token_count is null or token_count >= 0),
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding_status text not null default 'pending',
  embedding_error_message text,
  embedded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    source_type <> 'transcript'
    or (transcript_id is not null and lesson_id is not null)
  ),
  constraint content_chunks_transcript_lesson_fk
    foreign key (transcript_id, lesson_id)
    references public.lesson_transcripts (id, lesson_id)
    on delete cascade
);

alter table public.content_chunks drop constraint if exists content_chunks_source_type_check;
alter table public.content_chunks add constraint content_chunks_source_type_check
  check (source_type in ('transcript', 'lesson_metadata', 'exam_question', 'manual'));

alter table public.content_chunks drop constraint if exists content_chunks_embedding_status_check;
alter table public.content_chunks add constraint content_chunks_embedding_status_check
  check (embedding_status in ('not_required', 'pending', 'processing', 'ready', 'failed', 'stale'));

drop trigger if exists set_content_chunks_updated_at on public.content_chunks;
create trigger set_content_chunks_updated_at
  before update on public.content_chunks
  for each row
  execute function public.set_updated_at();

create unique index if not exists content_chunks_transcript_order_unique
  on public.content_chunks (transcript_id, chunk_index)
  where source_type = 'transcript' and transcript_id is not null;

create unique index if not exists content_chunks_lesson_source_order_unique
  on public.content_chunks (lesson_id, source_type, chunk_index)
  where transcript_id is null and lesson_id is not null;

create index if not exists idx_content_chunks_lesson_id
  on public.content_chunks (lesson_id)
  where lesson_id is not null;

create index if not exists idx_content_chunks_embedding_status
  on public.content_chunks (embedding_status)
  where embedding_status in ('pending', 'processing', 'failed', 'stale');

create index if not exists idx_content_chunks_metadata
  on public.content_chunks using gin (metadata);

-- Durable async work queue for webhooks, backfills, chunking, and embeddings.
create table if not exists public.transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  lesson_id bigint references public.lessons (id) on delete cascade,
  transcript_id uuid references public.lesson_transcripts (id) on delete set null,
  job_type text not null,
  status text not null default 'queued',
  priority smallint not null default 0,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  last_error text,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transcription_jobs drop constraint if exists transcription_jobs_job_type_check;
alter table public.transcription_jobs add constraint transcription_jobs_job_type_check
  check (job_type in ('mux_import', 'mux_generate', 'vimeo_import', 'manual_import', 'chunk', 'embed'));

alter table public.transcription_jobs drop constraint if exists transcription_jobs_status_check;
alter table public.transcription_jobs add constraint transcription_jobs_status_check
  check (status in ('queued', 'processing', 'succeeded', 'failed', 'dead', 'cancelled'));

drop trigger if exists set_transcription_jobs_updated_at on public.transcription_jobs;
create trigger set_transcription_jobs_updated_at
  before update on public.transcription_jobs
  for each row
  execute function public.set_updated_at();

create unique index if not exists transcription_jobs_idempotency_key_unique
  on public.transcription_jobs (idempotency_key);

create index if not exists idx_transcription_jobs_runnable
  on public.transcription_jobs (status, run_after, priority desc, created_at)
  where status in ('queued', 'failed');

create index if not exists idx_transcription_jobs_lesson_id
  on public.transcription_jobs (lesson_id)
  where lesson_id is not null;

create index if not exists idx_transcription_jobs_transcript_id
  on public.transcription_jobs (transcript_id)
  where transcript_id is not null;

alter table public.lesson_transcripts enable row level security;
alter table public.lesson_transcript_segments enable row level security;
alter table public.content_chunks enable row level security;
alter table public.transcription_jobs enable row level security;

drop policy if exists "lesson_transcripts_select_admin" on public.lesson_transcripts;
create policy "lesson_transcripts_select_admin"
  on public.lesson_transcripts for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "lesson_transcripts_insert_admin" on public.lesson_transcripts;
create policy "lesson_transcripts_insert_admin"
  on public.lesson_transcripts for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "lesson_transcripts_update_admin" on public.lesson_transcripts;
create policy "lesson_transcripts_update_admin"
  on public.lesson_transcripts for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "lesson_transcripts_delete_admin" on public.lesson_transcripts;
create policy "lesson_transcripts_delete_admin"
  on public.lesson_transcripts for delete
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "lesson_transcript_segments_select_admin" on public.lesson_transcript_segments;
create policy "lesson_transcript_segments_select_admin"
  on public.lesson_transcript_segments for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "lesson_transcript_segments_insert_admin" on public.lesson_transcript_segments;
create policy "lesson_transcript_segments_insert_admin"
  on public.lesson_transcript_segments for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "lesson_transcript_segments_update_admin" on public.lesson_transcript_segments;
create policy "lesson_transcript_segments_update_admin"
  on public.lesson_transcript_segments for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "lesson_transcript_segments_delete_admin" on public.lesson_transcript_segments;
create policy "lesson_transcript_segments_delete_admin"
  on public.lesson_transcript_segments for delete
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "content_chunks_select_admin" on public.content_chunks;
create policy "content_chunks_select_admin"
  on public.content_chunks for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "content_chunks_insert_admin" on public.content_chunks;
create policy "content_chunks_insert_admin"
  on public.content_chunks for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "content_chunks_update_admin" on public.content_chunks;
create policy "content_chunks_update_admin"
  on public.content_chunks for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "content_chunks_delete_admin" on public.content_chunks;
create policy "content_chunks_delete_admin"
  on public.content_chunks for delete
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "transcription_jobs_select_admin" on public.transcription_jobs;
create policy "transcription_jobs_select_admin"
  on public.transcription_jobs for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "transcription_jobs_insert_admin" on public.transcription_jobs;
create policy "transcription_jobs_insert_admin"
  on public.transcription_jobs for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "transcription_jobs_update_admin" on public.transcription_jobs;
create policy "transcription_jobs_update_admin"
  on public.transcription_jobs for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "transcription_jobs_delete_admin" on public.transcription_jobs;
create policy "transcription_jobs_delete_admin"
  on public.transcription_jobs for delete
  to authenticated
  using (public.is_platform_admin());
