-- Project Speed: collapse the student dashboard read model into one roundtrip.
-- Business rules remain in the application; this function only returns raw rows.

create or replace function public.get_student_dashboard_data(p_student_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with requested_student as (
    select s.id, s.access_level
    from public.students s
    where s.id = p_student_id
      and s.auth_user_id = auth.uid()
  ),
  published_modules as (
    select
      m.id,
      m.title,
      m.slug,
      m.description,
      m.short_description,
      m.order_index,
      m.thumbnail_url,
      m.icon_url,
      m.is_published,
      m.created_at,
      m.updated_at
    from public.modules m
    where m.is_published = true
  ),
  module_access as (
    select sma.module_id
    from public.student_module_access sma
    where sma.student_id = p_student_id
  ),
  visible_modules as (
    select pm.id
    from published_modules pm
    where not exists (select 1 from module_access)
       or exists (
         select 1
         from module_access ma
         where ma.module_id = pm.id
       )
  )
  select case
    when not exists (select 1 from requested_student) then null
    else jsonb_build_object(
      'accessLevel', (select rs.access_level from requested_student rs),
      'moduleAccessIds', coalesce(
        (select jsonb_agg(ma.module_id order by ma.module_id) from module_access ma),
        '[]'::jsonb
      ),
      'modules', coalesce(
        (
          select jsonb_agg(to_jsonb(pm) order by pm.order_index)
          from published_modules pm
        ),
        '[]'::jsonb
      ),
      'lessons', coalesce(
        (
          select jsonb_agg(to_jsonb(lesson_row) order by lesson_row.module_id, lesson_row.order_index)
          from (
            select
              l.id,
              l.module_id,
              l.title,
              l.slug,
              l.description,
              l.thumbnail_url,
              l.order_index,
              l.is_published
            from public.lessons l
            join visible_modules vm on vm.id = l.module_id
            where l.is_published = true
          ) lesson_row
        ),
        '[]'::jsonb
      ),
      'exams', coalesce(
        (
          select jsonb_agg(to_jsonb(exam_row) order by exam_row.module_id)
          from (
            select
              e.id,
              e.module_id,
              e.title,
              e.description,
              e.passing_score,
              e.is_published,
              e.created_at,
              e.updated_at
            from public.exams e
            where e.is_published = true
          ) exam_row
        ),
        '[]'::jsonb
      ),
      'passedExamIds', coalesce(
        (
          select jsonb_agg(distinct er.exam_id)
          from public.exam_results er
          where er.student_id = p_student_id
            and er.passed = true
        ),
        '[]'::jsonb
      ),
      'progress', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'lesson_id', p.lesson_id,
              'watched', p.watched,
              'watched_at', p.watched_at
            )
            order by p.lesson_id
          )
          from public.progress p
          join public.lessons l on l.id = p.lesson_id
          join visible_modules vm on vm.id = l.module_id
          where p.student_id = p_student_id
            and l.is_published = true
        ),
        '[]'::jsonb
      )
    )
  end;
$$;

revoke all on function public.get_student_dashboard_data(uuid) from public;
revoke all on function public.get_student_dashboard_data(uuid) from anon;
grant execute on function public.get_student_dashboard_data(uuid) to authenticated;

comment on function public.get_student_dashboard_data(uuid) is
  'Read-only Project Speed payload for the authenticated student dashboard.';

notify pgrst, 'reload schema';
