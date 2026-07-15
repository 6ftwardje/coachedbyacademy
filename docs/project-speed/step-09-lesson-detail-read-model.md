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

## Production result

Production was measured legacy, RPC, then legacy again with 15 fresh browser
contexts per round:

| Mode | DOMContentLoaded p50 / p95 | LCP p50 / p95 |
| --- | ---: | ---: |
| Legacy 1 | 925 / 1570 ms | 1016 / 1660 ms |
| Lesson RPC | 1136 / 2307 ms | 1224 / 2416 ms |
| Legacy 2 | 988 / 2673 ms | 1076 / 2780 ms |

The RPC is approximately 14% slower at median LCP than the average legacy
result. Reusing the broad dashboard payload costs more in production than the
saved roundtrips, so the production evidence rejects this read model.

All nine production browser checks pass after restoring the selected legacy
mode. Production keeps `PROJECT_SPEED_LESSON_DETAIL_RPC=off`. The authenticated
RPC remains available behind the flag for a future, narrower payload design.
