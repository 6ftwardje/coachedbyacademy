-- New students receive all-module access by default.
-- Existing level-1 students keep the standard sequential mentorship progression.

alter table public.students
  alter column access_level set default 2;

drop policy if exists "students_insert_own" on public.students;
create policy "students_insert_own"
  on public.students for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    and access_level = 2
  );

notify pgrst, 'reload schema';
