-- Performance indexes for server-rendered dashboard/admin paths.

create extension if not exists pg_trgm;

-- Admin student directory: default sort, access filter/sort, and fuzzy search.
create index if not exists idx_students_created_at_desc
  on public.students (created_at desc);

create index if not exists idx_students_access_level_created_at_desc
  on public.students (access_level, created_at desc);

create index if not exists idx_students_name_trgm
  on public.students using gin (name gin_trgm_ops)
  where name is not null;

create index if not exists idx_students_email_trgm
  on public.students using gin (email gin_trgm_ops);

-- Published curriculum lists render ordered modules and ordered lessons repeatedly.
create index if not exists idx_modules_published_order
  on public.modules (order_index)
  where is_published = true;

create index if not exists idx_lessons_published_module_order
  on public.lessons (module_id, order_index)
  where is_published = true;

create index if not exists idx_exams_published_module_id
  on public.exams (module_id)
  where is_published = true;

-- Dashboard/detail lookups: passed exams, latest attempts, and action progress.
create index if not exists idx_exam_results_student_exam_submitted_desc
  on public.exam_results (student_id, exam_id, submitted_at desc);

create index if not exists idx_exam_results_student_passed_exam
  on public.exam_results (student_id, exam_id)
  where passed = true;

create index if not exists idx_lesson_action_progress_student_lesson
  on public.lesson_action_progress (student_id, lesson_id);
