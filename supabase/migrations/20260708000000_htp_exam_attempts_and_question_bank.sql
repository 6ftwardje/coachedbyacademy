-- HTP-style module exams: question options, attempt snapshots, server-side scoring,
-- and transcript-derived question-bank seeds.

create extension if not exists pgcrypto;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students
    where auth_user_id = auth.uid()
      and access_level = 3
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

alter table public.exam_questions add column if not exists module_id bigint references public.modules (id) on delete cascade;
alter table public.exam_questions add column if not exists question_text text;
alter table public.exam_questions add column if not exists explanation text;
alter table public.exam_questions add column if not exists is_active boolean not null default true;
alter table public.exam_questions add column if not exists created_by uuid references public.students (id);
alter table public.exam_questions add column if not exists updated_by uuid references public.students (id);
alter table public.exam_questions add column if not exists deleted_at timestamptz;

update public.exam_questions q
set module_id = e.module_id
from public.exams e
where q.exam_id = e.id
  and q.module_id is null;

update public.exam_questions
set question_text = question
where question_text is null;

alter table public.exam_questions alter column module_id set not null;
alter table public.exam_questions alter column question_text set not null;

create index if not exists idx_exam_questions_module_id
  on public.exam_questions (module_id);

create index if not exists idx_exam_questions_active_valid
  on public.exam_questions (module_id, exam_id, is_active)
  where deleted_at is null;

create table if not exists public.exam_answer_options (
  id bigserial primary key,
  question_id bigint not null references public.exam_questions (id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_exam_answer_options_updated_at on public.exam_answer_options;
create trigger set_exam_answer_options_updated_at
  before update on public.exam_answer_options
  for each row
  execute function public.set_updated_at();

create index if not exists idx_exam_answer_options_question_id
  on public.exam_answer_options (question_id);

create unique index if not exists idx_exam_answer_options_one_correct
  on public.exam_answer_options (question_id)
  where is_correct = true;

insert into public.exam_answer_options (
  question_id,
  option_text,
  is_correct,
  order_index
)
select
  q.id,
  option_item.value #>> '{}',
  (option_item.value #>> '{}') = q.correct_answer,
  option_item.ordinality::integer - 1
from public.exam_questions q
cross join lateral jsonb_array_elements(q.options) with ordinality as option_item(value, ordinality)
where not exists (
  select 1
  from public.exam_answer_options existing
  where existing.question_id = q.id
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  exam_id bigint not null references public.exams (id) on delete cascade,
  module_id bigint not null references public.modules (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  score integer check (score between 0 and 100),
  correct_count integer,
  total_questions integer not null default 10,
  passed boolean,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_exam_attempts_updated_at on public.exam_attempts;
create trigger set_exam_attempts_updated_at
  before update on public.exam_attempts
  for each row
  execute function public.set_updated_at();

create index if not exists idx_exam_attempts_student_module_exam_status
  on public.exam_attempts (student_id, module_id, exam_id, status);

create table if not exists public.exam_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  question_id bigint not null references public.exam_questions (id) on delete restrict,
  order_index integer not null,
  question_snapshot text not null,
  explanation_snapshot text,
  options_snapshot jsonb not null check (jsonb_typeof(options_snapshot) = 'array'),
  correct_option_id bigint not null references public.exam_answer_options (id) on delete restrict,
  correct_option_snapshot text not null,
  unique (attempt_id, question_id),
  unique (attempt_id, order_index)
);

create index if not exists idx_exam_attempt_questions_attempt_id
  on public.exam_attempt_questions (attempt_id, order_index);

create index if not exists idx_exam_attempt_questions_question_id
  on public.exam_attempt_questions (question_id);

create table if not exists public.exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  question_id bigint not null references public.exam_questions (id) on delete restrict,
  selected_option_id bigint not null references public.exam_answer_options (id) on delete restrict,
  is_correct boolean not null,
  question_snapshot text not null,
  selected_option_snapshot text not null,
  correct_option_snapshot text not null,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists idx_exam_attempt_answers_attempt_id
  on public.exam_attempt_answers (attempt_id);

alter table public.exam_answer_options enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_questions enable row level security;
alter table public.exam_attempt_answers enable row level security;

drop policy if exists "exam_questions_select_published_exams" on public.exam_questions;

drop policy if exists "exams_select_admin" on public.exams;
create policy "exams_select_admin"
  on public.exams for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "exams_insert_admin" on public.exams;
create policy "exams_insert_admin"
  on public.exams for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "exams_update_admin" on public.exams;
create policy "exams_update_admin"
  on public.exams for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "exam_questions_select_admin" on public.exam_questions;
create policy "exam_questions_select_admin"
  on public.exam_questions for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "exam_questions_insert_admin" on public.exam_questions;
create policy "exam_questions_insert_admin"
  on public.exam_questions for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "exam_questions_update_admin" on public.exam_questions;
create policy "exam_questions_update_admin"
  on public.exam_questions for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "exam_answer_options_select_admin" on public.exam_answer_options;
create policy "exam_answer_options_select_admin"
  on public.exam_answer_options for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "exam_answer_options_insert_admin" on public.exam_answer_options;
create policy "exam_answer_options_insert_admin"
  on public.exam_answer_options for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "exam_answer_options_update_admin" on public.exam_answer_options;
create policy "exam_answer_options_update_admin"
  on public.exam_answer_options for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "exam_answer_options_delete_admin" on public.exam_answer_options;
create policy "exam_answer_options_delete_admin"
  on public.exam_answer_options for delete
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "exam_attempts_select_admin" on public.exam_attempts;
create policy "exam_attempts_select_admin"
  on public.exam_attempts for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "exam_attempt_questions_select_admin" on public.exam_attempt_questions;
create policy "exam_attempt_questions_select_admin"
  on public.exam_attempt_questions for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "exam_attempt_answers_select_admin" on public.exam_attempt_answers;
create policy "exam_attempt_answers_select_admin"
  on public.exam_attempt_answers for select
  to authenticated
  using (public.is_platform_admin());

create or replace function public.serialize_exam_attempt(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'attemptId', a.id,
    'examId', a.exam_id,
    'moduleId', a.module_id,
    'status', a.status,
    'score', a.score,
    'passed', a.passed,
    'totalQuestions', a.total_questions,
    'questions', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', aq.question_id,
            'questionText', aq.question_snapshot,
            'explanation', aq.explanation_snapshot,
            'options', aq.options_snapshot
          )
          order by aq.order_index
        )
        from public.exam_attempt_questions aq
        where aq.attempt_id = a.id
      ),
      '[]'::jsonb
    )
  )
  from public.exam_attempts a
  where a.id = p_attempt_id;
$$;

grant execute on function public.serialize_exam_attempt(uuid) to authenticated;

create or replace function public.start_module_exam(p_module_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_module public.modules%rowtype;
  v_exam public.exams%rowtype;
  v_has_explicit_access boolean := false;
  v_can_access boolean := false;
  v_previous_module_id bigint;
  v_previous_exam_id bigint;
  v_total_lessons integer := 0;
  v_completed_lessons integer := 0;
  v_active_question_count integer := 0;
  v_valid_question_count integer := 0;
  v_attempt_id uuid;
  v_question record;
  v_options_snapshot jsonb;
  v_correct_option record;
  v_order_index integer := 0;
begin
  select *
  into v_student
  from public.students
  where auth_user_id = auth.uid();

  if not found then
    return jsonb_build_object('success', false, 'error', 'Je bent niet aangemeld.');
  end if;

  select *
  into v_module
  from public.modules
  where id = p_module_id
    and is_published = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Deze module bestaat niet.');
  end if;

  select exists (
    select 1
    from public.student_module_access sma
    where sma.student_id = v_student.id
  )
  into v_has_explicit_access;

  if v_student.access_level >= 2 then
    v_can_access := true;
  elsif v_has_explicit_access then
    select exists (
      select 1
      from public.student_module_access sma
      where sma.student_id = v_student.id
        and sma.module_id = p_module_id
    )
    into v_can_access;
  else
    select previous_module.id
    into v_previous_module_id
    from public.modules previous_module
    where previous_module.is_published = true
      and previous_module.order_index < v_module.order_index
    order by previous_module.order_index desc
    limit 1;

    if v_previous_module_id is null then
      v_can_access := true;
    else
      select id
      into v_previous_exam_id
      from public.exams
      where module_id = v_previous_module_id
      limit 1;

      select exists (
        select 1
        from public.exam_results er
        where er.student_id = v_student.id
          and er.exam_id = v_previous_exam_id
          and er.passed = true
      )
      into v_can_access;
    end if;
  end if;

  if not v_can_access then
    return jsonb_build_object('success', false, 'error', 'Je hebt geen toegang tot deze toets.');
  end if;

  select *
  into v_exam
  from public.exams
  where module_id = p_module_id
    and is_published = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Nog geen toets ingesteld.');
  end if;

  select count(*)
  into v_total_lessons
  from public.lessons
  where module_id = p_module_id
    and is_published = true;

  select count(distinct l.id)
  into v_completed_lessons
  from public.lessons l
  join public.progress p
    on p.lesson_id = l.id
   and p.student_id = v_student.id
   and p.watched = true
  where l.module_id = p_module_id
    and l.is_published = true;

  if v_completed_lessons < v_total_lessons then
    return jsonb_build_object('success', false, 'error', 'Toets vergrendeld, rond eerst alle lessen af.');
  end if;

  select id
  into v_attempt_id
  from public.exam_attempts
  where student_id = v_student.id
    and module_id = p_module_id
    and exam_id = v_exam.id
    and status = 'in_progress'
  order by created_at desc
  limit 1;

  if v_attempt_id is not null then
    return jsonb_build_object(
      'success', true,
      'attempt', public.serialize_exam_attempt(v_attempt_id)
    );
  end if;

  select count(*)
  into v_active_question_count
  from public.exam_questions q
  where q.exam_id = v_exam.id
    and q.module_id = p_module_id
    and q.is_active = true
    and q.deleted_at is null;

  with option_counts as (
    select
      o.question_id,
      count(*) as option_count,
      count(*) filter (where o.is_correct) as correct_count
    from public.exam_answer_options o
    group by o.question_id
  )
  select count(*)
  into v_valid_question_count
  from public.exam_questions q
  join option_counts oc on oc.question_id = q.id
  where q.exam_id = v_exam.id
    and q.module_id = p_module_id
    and q.is_active = true
    and q.deleted_at is null
    and oc.option_count >= 2
    and oc.correct_count = 1;

  if v_valid_question_count < 10 then
    return jsonb_build_object(
      'success', false,
      'error', 'Deze toets heeft nog te weinig geldige vragen.',
      'activeQuestionCount', v_active_question_count,
      'validQuestionCount', v_valid_question_count,
      'requiredQuestionCount', 10
    );
  end if;

  insert into public.exam_attempts (
    student_id,
    exam_id,
    module_id,
    total_questions
  )
  values (
    v_student.id,
    v_exam.id,
    p_module_id,
    10
  )
  returning id into v_attempt_id;

  for v_question in
    with option_counts as (
      select
        o.question_id,
        count(*) as option_count,
        count(*) filter (where o.is_correct) as correct_count
      from public.exam_answer_options o
      group by o.question_id
    )
    select q.id, q.question_text, q.explanation
    from public.exam_questions q
    join option_counts oc on oc.question_id = q.id
    where q.exam_id = v_exam.id
      and q.module_id = p_module_id
      and q.is_active = true
      and q.deleted_at is null
      and oc.option_count >= 2
      and oc.correct_count = 1
    order by random()
    limit 10
  loop
    v_order_index := v_order_index + 1;

    select o.id, o.option_text
    into v_correct_option
    from public.exam_answer_options o
    where o.question_id = v_question.id
      and o.is_correct = true
    limit 1;

    select jsonb_agg(
      jsonb_build_object('id', randomized.id, 'optionText', randomized.option_text)
    )
    into v_options_snapshot
    from (
      select o.id, o.option_text
      from public.exam_answer_options o
      where o.question_id = v_question.id
      order by random()
    ) randomized;

    insert into public.exam_attempt_questions (
      attempt_id,
      question_id,
      order_index,
      question_snapshot,
      explanation_snapshot,
      options_snapshot,
      correct_option_id,
      correct_option_snapshot
    )
    values (
      v_attempt_id,
      v_question.id,
      v_order_index,
      v_question.question_text,
      v_question.explanation,
      v_options_snapshot,
      v_correct_option.id,
      v_correct_option.option_text
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'attempt', public.serialize_exam_attempt(v_attempt_id)
  );
end;
$$;

grant execute on function public.start_module_exam(bigint) to authenticated;

create or replace function public.submit_module_exam(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_attempt public.exam_attempts%rowtype;
  v_answer jsonb;
  v_question_id bigint;
  v_selected_option_id bigint;
  v_selected_option_text text;
  v_attempt_question public.exam_attempt_questions%rowtype;
  v_seen_question_ids bigint[] := '{}';
  v_correct_count integer := 0;
  v_score integer := 0;
  v_passed boolean := false;
  v_passing_score integer := 70;
begin
  select *
  into v_student
  from public.students
  where auth_user_id = auth.uid();

  if not found then
    return jsonb_build_object('success', false, 'error', 'Je bent niet aangemeld.');
  end if;

  select *
  into v_attempt
  from public.exam_attempts
  where id = p_attempt_id
    and student_id = v_student.id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Poging niet gevonden.');
  end if;

  if v_attempt.status = 'submitted' then
    return jsonb_build_object(
      'success', true,
      'score', v_attempt.score,
      'passed', v_attempt.passed,
      'correctCount', v_attempt.correct_count,
      'totalQuestions', v_attempt.total_questions
    );
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    return jsonb_build_object('success', false, 'error', 'Antwoorden hebben een ongeldig formaat.');
  end if;

  if jsonb_array_length(p_answers) <> v_attempt.total_questions then
    return jsonb_build_object('success', false, 'error', 'Beantwoord alle vragen voordat je indient.');
  end if;

  for v_answer in
    select value
    from jsonb_array_elements(p_answers)
  loop
    v_question_id := (v_answer ->> 'questionId')::bigint;
    v_selected_option_id := (v_answer ->> 'selectedOptionId')::bigint;

    if v_question_id = any(v_seen_question_ids) then
      return jsonb_build_object('success', false, 'error', 'Elke vraag mag maar een antwoord hebben.');
    end if;
    v_seen_question_ids := array_append(v_seen_question_ids, v_question_id);

    select *
    into v_attempt_question
    from public.exam_attempt_questions aq
    where aq.attempt_id = p_attempt_id
      and aq.question_id = v_question_id;

    if not found then
      return jsonb_build_object('success', false, 'error', 'Een antwoord hoort niet bij deze poging.');
    end if;

    select option_item.value ->> 'optionText'
    into v_selected_option_text
    from jsonb_array_elements(v_attempt_question.options_snapshot) as option_item(value)
    where (option_item.value ->> 'id')::bigint = v_selected_option_id
    limit 1;

    if v_selected_option_text is null then
      return jsonb_build_object('success', false, 'error', 'Een gekozen antwoord is ongeldig.');
    end if;

    insert into public.exam_attempt_answers (
      attempt_id,
      question_id,
      selected_option_id,
      is_correct,
      question_snapshot,
      selected_option_snapshot,
      correct_option_snapshot
    )
    values (
      p_attempt_id,
      v_question_id,
      v_selected_option_id,
      v_selected_option_id = v_attempt_question.correct_option_id,
      v_attempt_question.question_snapshot,
      v_selected_option_text,
      v_attempt_question.correct_option_snapshot
    );
  end loop;

  select count(*) filter (where is_correct)
  into v_correct_count
  from public.exam_attempt_answers
  where attempt_id = p_attempt_id;

  v_score := round((v_correct_count::numeric / v_attempt.total_questions::numeric) * 100)::integer;

  select passing_score
  into v_passing_score
  from public.exams
  where id = v_attempt.exam_id;

  v_passed := v_score >= coalesce(v_passing_score, 70);

  update public.exam_attempts
  set
    status = 'submitted',
    score = v_score,
    correct_count = v_correct_count,
    passed = v_passed,
    submitted_at = now()
  where id = p_attempt_id;

  insert into public.exam_results (
    student_id,
    exam_id,
    score,
    passed
  )
  values (
    v_student.id,
    v_attempt.exam_id,
    v_score,
    v_passed
  );

  return jsonb_build_object(
    'success', true,
    'score', v_score,
    'passed', v_passed,
    'correctCount', v_correct_count,
    'totalQuestions', v_attempt.total_questions
  );
end;
$$;

grant execute on function public.submit_module_exam(uuid, jsonb) to authenticated;

do $$
declare
  v_seed record;
  v_module_id bigint;
  v_exam_id bigint;
  v_question_id bigint;
  v_option_index integer;
  v_options text[];
begin
  for v_seed in
    select *
    from (
      values
        (1, 1001, 'Welke uitspraak past het best bij `Frequentie` volgens de module?', 'Het aantal keren per week dat een client krachttraining uitvoert.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (1, 1002, 'Welke uitspraak past het best bij `General population` volgens de module?', 'De doelgroep van gewone clients met werk, gezin of andere verantwoordelijkheden.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (1, 1003, 'Welke uitspraak past het best bij `Trainingssplit` volgens de module?', 'De verdeling van trainingen over full body, upper, lower of combinaties.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (1, 1004, 'Welke uitspraak past het best bij `Compound oefening` volgens de module?', 'Een belangrijke basisoefening die meerdere gewrichten of spiergroepen aanspreekt.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (2, 1001, 'Welke uitspraak past het best bij `Energiebalans` volgens de module?', 'De verhouding tussen calorieen die binnenkomen en calorieen die buitengaan.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (2, 1002, 'Welke uitspraak past het best bij `BMR` volgens de module?', 'Basal metabolic rate: energie die nodig is voor basisfuncties van het lichaam.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (2, 1003, 'Welke uitspraak past het best bij `NEAT` volgens de module?', 'Non-exercise activity thermogenesis: dagelijkse beweging die geen sport is.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (2, 1004, 'Welke uitspraak past het best bij `TEF` volgens de module?', 'Thermic effect of food: energie die nodig is om voedsel te verteren en verwerken.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (3, 1001, 'Welke uitspraak past het best bij `Business blueprint` volgens de module?', 'Een centrale plek waar de startende coach ideeen, sterktes, aanbod, doelgroep en acties structureert.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (3, 1002, 'Welke uitspraak past het best bij `Sterktes als coach` volgens de module?', 'Eigenschappen, ervaringen en kwaliteiten die verklaren waarom mensen voor jou zouden kiezen.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (3, 1003, 'Welke uitspraak past het best bij `Personal brand` volgens de module?', 'De manier waarop een coach energie, waarden, verhaal, communicatie en transformatie zichtbaar maakt.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (3, 1004, 'Welke uitspraak past het best bij `Content buckets` volgens de module?', 'Terugkerende inhoudsthema''s waarmee de coach de komende weken zichtbaar wordt.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (4, 1001, 'Welke uitspraak past het best bij `Coach versus personal trainer` volgens de module?', 'Een coach begeleidt breder dan alleen training; hij integreert training, voeding, gedrag, doelen en relatie.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (4, 1002, 'Welke uitspraak past het best bij `Onderliggende motivatie` volgens de module?', 'De echte reden waarom iemand een doel wil bereiken.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (4, 1003, 'Welke uitspraak past het best bij `Dynamische doelen` volgens de module?', 'Doelen kunnen tijdens het traject veranderen en moeten opnieuw bevraagd worden.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (4, 1004, 'Welke uitspraak past het best bij `Levels van coaching` volgens de module?', 'Een schaal van kennisoverdracht naar feedback, accountability, commitment en authentieke connectie.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (5, 1001, 'Welke uitspraak past het best bij `Acquisitiesysteem` volgens de module?', 'Een vierdelig systeem om aanbod, leads, gesprekken en sales op elkaar te laten voortbouwen.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (5, 1002, 'Welke uitspraak past het best bij `Offer Creation` volgens de module?', 'Het bouwen van een aanbod dat concreet maakt voor wie het is, welk resultaat het geeft en via welke methode.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (5, 1003, 'Welke uitspraak past het best bij `Blue Ocean strategie` volgens de module?', 'Kiezen voor een specifiek segment waar je minder vervangbaar bent.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.'),
        (5, 1004, 'Welke uitspraak past het best bij `Niche` volgens de module?', 'De specifieke doelgroep en context waarop het aanbod zich richt.', 'Het is vooral een externe theorie die buiten het traject valt.', 'Het is alleen relevant voor gevorderde atleten en niet voor de genoemde doelgroep.', 'Het vervangt de nood aan context, vragen stellen of opvolging.', 'Optie A volgt de transcriptie. De andere opties maken de claim te breed, te extern of te absoluut.')
    ) as seed(module_order, order_index, question_text, option_a, option_b, option_c, option_d, explanation)
  loop
    select id
    into v_module_id
    from public.modules
    where order_index = v_seed.module_order
    limit 1;

    if v_module_id is null then
      continue;
    end if;

    insert into public.exams (
      module_id,
      title,
      description,
      passing_score,
      is_published
    )
    select
      m.id,
      m.title || ' toets',
      'Beantwoord 10 willekeurige vragen om deze module af te ronden.',
      70,
      true
    from public.modules m
    where m.id = v_module_id
    on conflict (module_id) do update
      set module_id = excluded.module_id
    returning id into v_exam_id;

    if exists (
      select 1
      from public.exam_questions q
      where q.module_id = v_module_id
        and q.question_text = v_seed.question_text
        and q.deleted_at is null
    ) then
      continue;
    end if;

    v_options := array[
      v_seed.option_a,
      v_seed.option_b,
      v_seed.option_c,
      v_seed.option_d
    ];

    insert into public.exam_questions (
      exam_id,
      module_id,
      question,
      question_text,
      explanation,
      options,
      correct_answer,
      order_index,
      is_active
    )
    values (
      v_exam_id,
      v_module_id,
      v_seed.question_text,
      v_seed.question_text,
      v_seed.explanation,
      to_jsonb(v_options),
      v_seed.option_a,
      v_seed.order_index,
      true
    )
    returning id into v_question_id;

    for v_option_index in 1..array_length(v_options, 1) loop
      insert into public.exam_answer_options (
        question_id,
        option_text,
        is_correct,
        order_index
      )
      values (
        v_question_id,
        v_options[v_option_index],
        v_option_index = 1,
        v_option_index - 1
      );
    end loop;
  end loop;
end $$;

notify pgrst, 'reload schema';
