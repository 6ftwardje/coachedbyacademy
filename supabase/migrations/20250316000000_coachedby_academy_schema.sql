-- CoachedBy Academy – PostgreSQL schema
-- Learning platform for coaches: modules, lessons, exams, progress.

create extension if not exists pgcrypto;

-- =============================================================================
-- Updated_at trigger
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Tables
-- =============================================================================

create table public.students (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  auth_user_id uuid unique not null,
  access_level smallint not null default 1 check (access_level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen timestamptz,
  phone text check (phone is null or (length(trim(phone)) >= 8 and length(phone) <= 20))
);

create trigger set_students_updated_at
  before update on public.students
  for each row
  execute function public.set_updated_at();

create index idx_students_auth_user_id on public.students (auth_user_id);

-- -----------------------------------------------------------------------------

create table public.modules (
  id bigserial primary key,
  title text not null,
  slug text unique not null,
  description text,
  short_description text,
  order_index integer not null unique,
  thumbnail_url text,
  icon_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_modules_updated_at
  before update on public.modules
  for each row
  execute function public.set_updated_at();

create index idx_modules_order_index on public.modules (order_index);
create index idx_modules_is_published on public.modules (is_published) where is_published = true;

-- -----------------------------------------------------------------------------

create table public.lessons (
  id bigserial primary key,
  module_id bigint not null references public.modules (id) on delete cascade,
  title text not null,
  slug text unique not null,
  description text,
  video_url text,
  video_provider text not null default 'vimeo',
  video_duration_seconds integer,
  thumbnail_url text,
  order_index integer not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, order_index)
);

create trigger set_lessons_updated_at
  before update on public.lessons
  for each row
  execute function public.set_updated_at();

create index idx_lessons_module_id on public.lessons (module_id);
create index idx_lessons_module_order on public.lessons (module_id, order_index);
create index idx_lessons_is_published on public.lessons (is_published) where is_published = true;

-- -----------------------------------------------------------------------------

create table public.exams (
  id bigserial primary key,
  module_id bigint not null unique references public.modules (id) on delete cascade,
  title text not null,
  description text,
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_exams_updated_at
  before update on public.exams
  for each row
  execute function public.set_updated_at();

create index idx_exams_module_id on public.exams (module_id);
create index idx_exams_is_published on public.exams (is_published) where is_published = true;

-- -----------------------------------------------------------------------------

create table public.exam_questions (
  id bigserial primary key,
  exam_id bigint not null references public.exams (id) on delete cascade,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_answer text not null,
  order_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, order_index)
);

create trigger set_exam_questions_updated_at
  before update on public.exam_questions
  for each row
  execute function public.set_updated_at();

create index idx_exam_questions_exam_id on public.exam_questions (exam_id);
create index idx_exam_questions_exam_order on public.exam_questions (exam_id, order_index);

-- -----------------------------------------------------------------------------

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  exam_id bigint not null references public.exams (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_exam_results_student_id on public.exam_results (student_id);
create index idx_exam_results_exam_id on public.exam_results (exam_id);
create index idx_exam_results_student_exam on public.exam_results (student_id, exam_id);

-- -----------------------------------------------------------------------------

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  watched boolean not null default false,
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create trigger set_progress_updated_at
  before update on public.progress
  for each row
  execute function public.set_updated_at();

create index idx_progress_student_id on public.progress (student_id);
create index idx_progress_lesson_id on public.progress (lesson_id);
create index idx_progress_student_lesson on public.progress (student_id, lesson_id);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.students enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_results enable row level security;
alter table public.progress enable row level security;

-- -----------------------------------------------------------------------------
-- Public content: published modules, lessons, exams, exam_questions
-- -----------------------------------------------------------------------------

create policy "modules_select_published"
  on public.modules for select
  to authenticated
  using (is_published = true);

create policy "lessons_select_published"
  on public.lessons for select
  to authenticated
  using (is_published = true);

create policy "exams_select_published"
  on public.exams for select
  to authenticated
  using (is_published = true);

create policy "exam_questions_select_published_exams"
  on public.exam_questions for select
  to authenticated
  using (
    exists (
      select 1
      from public.exams e
      where e.id = exam_questions.exam_id
        and e.is_published = true
    )
  );

-- -----------------------------------------------------------------------------
-- students: own row only
-- -----------------------------------------------------------------------------

create policy "students_select_own"
  on public.students for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "students_update_own_profile"
  on public.students for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    -- application should restrict updated columns to name, phone, last_seen, updated_at
  );

-- No insert/delete policies: students created via backend/service role only.

-- -----------------------------------------------------------------------------
-- progress: own progress only, insert/update via own student_id
-- -----------------------------------------------------------------------------

create policy "progress_select_own"
  on public.progress for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = progress.student_id
        and s.auth_user_id = auth.uid()
    )
  );

create policy "progress_insert_own"
  on public.progress for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.students s
      where s.id = progress.student_id
        and s.auth_user_id = auth.uid()
    )
  );

create policy "progress_update_own"
  on public.progress for update
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = progress.student_id
        and s.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = progress.student_id
        and s.auth_user_id = auth.uid()
    )
  );

-- No delete: progress not deletable from client.

-- -----------------------------------------------------------------------------
-- exam_results: own results only, insert only
-- -----------------------------------------------------------------------------

create policy "exam_results_select_own"
  on public.exam_results for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = exam_results.student_id
        and s.auth_user_id = auth.uid()
    )
  );

create policy "exam_results_insert_own"
  on public.exam_results for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.students s
      where s.id = exam_results.student_id
        and s.auth_user_id = auth.uid()
    )
  );

-- No update/delete: exam_results not updatable/deletable from client.

-- =============================================================================
-- Seed data (optional)
-- =============================================================================

insert into public.modules (title, slug, short_description, order_index) values
  ('Training & Periodisation', 'training-periodisation', 'Build effective training and periodisation plans.', 1),
  ('Nutrition Plan Design', 'nutrition-plan-design', 'Design nutrition plans for your clients.', 2),
  ('Start & Stand Out as a Coach', 'start-stand-out-as-coach', 'Launch and differentiate yourself as a coach.', 3),
  ('Leadership & Coaching Skills', 'leadership-coaching-skills', 'Develop leadership and coaching skills.', 4);

insert into public.lessons (module_id, title, slug, order_index) values
  (1, 'Introduction to Periodisation', 'introduction-periodisation', 1),
  (1, 'Training Cycles and Phases', 'training-cycles-phases', 2),
  (1, 'Programming for Coaches', 'programming-coaches', 3),
  (2, 'Nutrition Fundamentals', 'nutrition-fundamentals', 1),
  (2, 'Building Meal Plans', 'building-meal-plans', 2),
  (2, 'Client Assessment', 'client-assessment', 3),
  (3, 'Positioning as a Coach', 'positioning-coach', 1),
  (3, 'Marketing and Visibility', 'marketing-visibility', 2),
  (3, 'First Clients', 'first-clients', 3),
  (4, 'Leadership Basics', 'leadership-basics', 1),
  (4, 'Communication in Coaching', 'communication-coaching', 2),
  (4, 'Feedback and Growth', 'feedback-growth', 3);

insert into public.exams (module_id, title, passing_score) values
  (1, 'Training & Periodisation – Exam', 70),
  (2, 'Nutrition Plan Design – Exam', 70),
  (3, 'Start & Stand Out as a Coach – Exam', 70),
  (4, 'Leadership & Coaching Skills – Exam', 70);

insert into public.exam_questions (exam_id, question, options, correct_answer, order_index) values
  (1, 'What is the main goal of periodisation?', '["Maximise fatigue", "Manage adaptation and recovery", "Reduce training volume", "Eliminate rest days"]'::jsonb, 'Manage adaptation and recovery', 1),
  (1, 'Which phase typically focuses on building a base?', '["Peaking", "Competition", "Preparation", "Taper"]'::jsonb, 'Preparation', 2),
  (1, 'Macrocycle usually refers to:', '["A single session", "A week of training", "An annual or multi-month plan", "One exercise"]'::jsonb, 'An annual or multi-month plan', 3),
  (2, 'What is a key factor in nutrition plan design?', '["Ignoring preferences", "Individual needs and goals", "One-size-fits-all", "Eliminating carbs"]'::jsonb, 'Individual needs and goals', 1),
  (2, 'Protein intake is important for:', '["Only bodybuilders", "Muscle repair and satiety", "Replacing water", "Reducing fibre"]'::jsonb, 'Muscle repair and satiety', 2),
  (2, 'A balanced meal plan should consider:', '["Only calories", "Calories, macros, timing, and preferences", "Only timing", "Only preferences"]'::jsonb, 'Calories, macros, timing, and preferences', 3),
  (3, 'To stand out as a coach, you should:', '["Copy everyone else", "Define your niche and value", "Avoid social media", "Only work for free"]'::jsonb, 'Define your niche and value', 1),
  (3, 'Marketing for coaches often includes:', '["No content", "Content, testimonials, and visibility", "Only paid ads", "Hiding your expertise"]'::jsonb, 'Content, testimonials, and visibility', 2),
  (3, 'Getting first clients usually requires:', '["Waiting only", "Outreach, trust-building, and proof", "No portfolio", "No communication"]'::jsonb, 'Outreach, trust-building, and proof', 3),
  (4, 'Leadership in coaching involves:', '["Only giving orders", "Inspiring, guiding, and supporting", "Avoiding decisions", "No feedback"]'::jsonb, 'Inspiring, guiding, and supporting', 1),
  (4, 'Effective communication includes:', '["Only talking", "Listening, clarity, and empathy", "Only writing", "Avoiding questions"]'::jsonb, 'Listening, clarity, and empathy', 2),
  (4, 'Feedback should be:', '["Only negative", "Constructive and timely", "Only once a year", "Avoided"]'::jsonb, 'Constructive and timely', 3);
