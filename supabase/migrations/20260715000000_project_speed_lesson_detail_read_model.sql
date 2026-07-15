-- Project Speed: return all read-only lesson detail data in one roundtrip.
-- The existing dashboard function and every table read remain security invoker.

create or replace function public.get_student_lesson_detail_data(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with requested_student as (
    select s.id
    from public.students s
    where s.auth_user_id = auth.uid()
    limit 1
  ),
  course_payload as (
    select public.get_student_dashboard_data(rs.id) as value
    from requested_student rs
  ),
  requested_lesson as (
    select
      l.id,
      l.module_id,
      l.title,
      l.slug,
      l.description,
      l.takeaway,
      l.action_items,
      l.video_url,
      l.video_provider,
      l.video_duration_seconds,
      l.thumbnail_url,
      l.mux_asset_id,
      l.mux_playback_id,
      l.mux_playback_policy,
      l.mux_status,
      l.mux_upload_id,
      l.mux_error_message,
      l.order_index,
      l.is_published,
      l.created_at,
      l.updated_at
    from public.lessons l
    where l.slug = p_slug
      and l.is_published = true
    limit 1
  )
  select case
    when not exists (select 1 from requested_student)
      or not exists (select 1 from requested_lesson)
      or (select cp.value from course_payload cp) is null
    then null
    else jsonb_build_object(
      'studentId', (select rs.id from requested_student rs),
      'course', (select cp.value from course_payload cp),
      'lesson', (select to_jsonb(rl) from requested_lesson rl),
      'actionProgress', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'action_index', lap.action_index,
              'completed', lap.completed
            )
            order by lap.action_index
          )
          from public.lesson_action_progress lap
          where lap.student_id = (select rs.id from requested_student rs)
            and lap.lesson_id = (select rl.id from requested_lesson rl)
        ),
        '[]'::jsonb
      )
    )
  end;
$$;

revoke all on function public.get_student_lesson_detail_data(text) from public;
revoke all on function public.get_student_lesson_detail_data(text) from anon;
grant execute on function public.get_student_lesson_detail_data(text) to authenticated;

comment on function public.get_student_lesson_detail_data(text) is
  'Read-only Project Speed payload for an authenticated student lesson page.';

notify pgrst, 'reload schema';
