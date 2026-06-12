-- Per-student module visibility overrides.
-- No rows for a student means the standard academy progression remains active.
-- One or more rows means the student can only see/access those modules.

create table if not exists public.student_module_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  module_id bigint not null references public.modules (id) on delete cascade,
  granted_by uuid references public.students (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, module_id)
);

create index if not exists idx_student_module_access_student_id
  on public.student_module_access (student_id);

create index if not exists idx_student_module_access_module_id
  on public.student_module_access (module_id);

alter table public.student_module_access enable row level security;

drop policy if exists "student_module_access_select_own" on public.student_module_access;
create policy "student_module_access_select_own"
  on public.student_module_access for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_module_access.student_id
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "student_module_access_select_admin" on public.student_module_access;
create policy "student_module_access_select_admin"
  on public.student_module_access for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "student_module_access_insert_admin" on public.student_module_access;
create policy "student_module_access_insert_admin"
  on public.student_module_access for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "student_module_access_update_admin" on public.student_module_access;
create policy "student_module_access_update_admin"
  on public.student_module_access for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "student_module_access_delete_admin" on public.student_module_access;
create policy "student_module_access_delete_admin"
  on public.student_module_access for delete
  to authenticated
  using (public.is_platform_admin());

notify pgrst, 'reload schema';
