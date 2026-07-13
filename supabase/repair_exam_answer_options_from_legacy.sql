-- Repair exam_answer_options from the legacy exam_questions.options JSON.
--
-- Use this when questions exist in the admin UI but show:
-- "0 opties, 0 correct" / "Check nodig".
--
-- The current exam UI and start_module_exam RPC validate questions through
-- public.exam_answer_options. Older/legacy question fields on exam_questions
-- are still filled, but they are not enough for a valid exam.

begin;

insert into public.exam_answer_options (
  question_id,
  option_text,
  is_correct,
  order_index
)
select
  q.id,
  option_item.option_text,
  option_item.option_text = q.correct_answer,
  option_item.order_index
from public.exam_questions q
cross join lateral (
  select
    value #>> '{}' as option_text,
    ordinality::integer - 1 as order_index
  from jsonb_array_elements(q.options) with ordinality as option_value(value, ordinality)
) option_item
where q.deleted_at is null
  and q.options is not null
  and jsonb_typeof(q.options) = 'array'
  and jsonb_array_length(q.options) >= 2
  and q.correct_answer is not null
  and q.correct_answer <> ''
  and option_item.option_text <> ''
  and not exists (
    select 1
    from public.exam_answer_options existing
    where existing.question_id = q.id
      and existing.option_text = option_item.option_text
  )
on conflict do nothing;

update public.exam_answer_options option
set
  is_correct = false,
  updated_at = now()
from public.exam_questions question
where option.question_id = question.id
  and question.deleted_at is null
  and question.correct_answer is not null
  and question.correct_answer <> ''
  and option.option_text <> question.correct_answer
  and option.is_correct = true;

update public.exam_answer_options option
set
  is_correct = true,
  updated_at = now()
from public.exam_questions question
where option.question_id = question.id
  and question.deleted_at is null
  and question.correct_answer is not null
  and question.correct_answer <> ''
  and option.option_text = question.correct_answer
  and option.is_correct = false;

with option_counts as (
  select
    o.question_id,
    count(*) as option_count,
    count(*) filter (where o.is_correct) as correct_count
  from public.exam_answer_options o
  group by o.question_id
),
module_counts as (
  select
    m.order_index,
    m.title as module_title,
    count(q.id) filter (
      where q.is_active = true
        and q.deleted_at is null
    ) as active_question_count,
    count(q.id) filter (
      where q.is_active = true
        and q.deleted_at is null
        and coalesce(oc.option_count, 0) >= 2
        and coalesce(oc.correct_count, 0) = 1
    ) as valid_active_question_count
  from public.modules m
  join public.exams e
    on e.module_id = m.id
  left join public.exam_questions q
    on q.module_id = m.id
   and q.exam_id = e.id
  left join option_counts oc
    on oc.question_id = q.id
  group by m.order_index, m.title
)
select
  order_index,
  module_title,
  active_question_count,
  valid_active_question_count,
  case
    when valid_active_question_count >= 10 then 'ready'
    else 'needs_more_questions'
  end as exam_status
from module_counts
order by order_index;

commit;
