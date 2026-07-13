-- Atomic job claiming for transcription workers.

do $$
begin
  if to_regclass('public.transcription_jobs') is null then
    raise exception
      'Missing dependency: public.transcription_jobs. Apply supabase/migrations/20260629000000_lesson_transcriptions.sql before this migration.';
  end if;
end;
$$;

create or replace function public.claim_transcription_jobs(
  p_worker_id text,
  p_job_types text[] default null,
  p_limit integer default 5,
  p_stale_after interval default interval '15 minutes'
)
returns setof public.transcription_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.transcription_jobs
  set status = 'failed',
      locked_at = null,
      locked_by = null,
      last_error = coalesce(last_error, 'Worker lock expired.'),
      run_after = now()
  where status = 'processing'
    and locked_at is not null
    and locked_at < now() - p_stale_after
    and attempts < max_attempts;

  update public.transcription_jobs
  set status = 'dead',
      locked_at = null,
      locked_by = null,
      last_error = coalesce(last_error, 'Worker lock expired after max attempts.'),
      finished_at = now()
  where status = 'processing'
    and locked_at is not null
    and locked_at < now() - p_stale_after
    and attempts >= max_attempts;

  return query
  with candidates as (
    select id
    from public.transcription_jobs
    where status in ('queued', 'failed')
      and run_after <= now()
      and attempts < max_attempts
      and (
        p_job_types is null
        or array_length(p_job_types, 1) is null
        or job_type = any(p_job_types)
      )
    order by priority desc, run_after asc, created_at asc
    limit greatest(least(p_limit, 25), 1)
    for update skip locked
  ),
  claimed as (
    update public.transcription_jobs j
    set status = 'processing',
        attempts = attempts + 1,
        locked_at = now(),
        locked_by = p_worker_id,
        last_error = null
    from candidates
    where j.id = candidates.id
    returning j.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_transcription_jobs(text, text[], integer, interval) from public;
grant execute on function public.claim_transcription_jobs(text, text[], integer, interval) to service_role;
