-- One-time cleanup after replacing active exam question banks.
-- Deletes only unfinished attempts whose snapshots reference inactive or
-- archived questions. Submitted attempts and exam results remain untouched.

begin;

delete from public.exam_attempts attempt
where attempt.status = 'in_progress'
  and exists (
    select 1
    from public.exam_attempt_questions snapshot
    join public.exam_questions question
      on question.id = snapshot.question_id
    where snapshot.attempt_id = attempt.id
      and (
        question.is_active = false
        or question.deleted_at is not null
      )
  );

commit;
