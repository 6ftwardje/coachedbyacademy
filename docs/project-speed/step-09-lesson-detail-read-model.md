# Project Speed: Step 9 lesson detail read model

Step 9 collapses the lesson page's student, course, access, progress, exam and
action reads into one authenticated Supabase RPC.

## Architecture and access

- PostgreSQL resolves the student from `auth.uid()`; the browser cannot select
  another student ID.
- The function is `security invoker` and reuses the existing dashboard read
  model, so Row Level Security remains active.
- Anonymous and public roles have no execute permission. A direct anonymous
  request returns HTTP 401 with PostgreSQL permission denied.
- The application validates the complete JSON payload before using it.
- Module visibility and sequential lesson gates still use the existing shared
  TypeScript builders.
- Any missing function or invalid RPC response automatically falls back to the
  legacy read path.
- `PROJECT_SPEED_LESSON_DETAIL_RPC=off` explicitly selects the legacy path.

## Local A/B

Verified in one production build on 2026-07-15. Fifteen fresh browser contexts
were alternated between both local origins to expose them to the same Supabase
latency:

| Mode | DOMContentLoaded p50 / p95 | LCP p50 / p95 |
| --- | ---: | ---: |
| Legacy reads | 454 / 1531 ms | 556 / 1620 ms |
| Lesson RPC | 95 / 196 ms | 180 / 284 ms |

The RPC improves median LCP by 68% and p95 LCP by 82%. Both modes produce the
same SHA-256 hash for all visible text and links. The RPC itself completed in
approximately 79-101 ms during the browser suite, and all nine browser checks
passed.

## Exit criteria

- The migration is applied directly to the linked Supabase project.
- Production browser checks pass with the feature enabled.
- A production A/B confirms lower lesson completion timing or LCP.
- Production only keeps `PROJECT_SPEED_LESSON_DETAIL_RPC=on` when the live
  result is faster.
