# Project Speed: Step 8 parallel detail reads

Step 8 shortens the server-side data waterfalls for module and lesson detail
pages. Existing Supabase queries, RLS policies and result builders remain
unchanged; independent reads start together instead of waiting in sequence.

## Read stages

- Student identity and the requested module or lesson load concurrently.
- Course metadata for the requested detail page loads concurrently.
- Student progress, access and exam state load concurrently once their IDs are
  known.
- Route timing is emitted as structured `module.detail.*` and
  `lesson.detail.*` performance events.
- `PROJECT_SPEED_PARALLEL_DETAIL_READS=off` restores sequential loading.

## Exit criteria

- Both modes render identical text and links for module and lesson details.
- All read-only browser checks pass with parallel loading enabled.
- Production A/B improves detail-route completion or LCP without increasing
  errors.

## Local A/B

Verified in one production build on 2026-07-15 with ten fresh browser contexts
per route:

| Route | Mode | DOMContentLoaded p50 | LCP p50 |
| --- | --- | ---: | ---: |
| Module detail | Sequential | 458 ms | 480 ms |
| Module detail | Parallel | 332 ms | 356 ms |
| Lesson detail | Sequential | 451 ms | 552 ms |
| Lesson detail | Parallel | 406 ms | 496 ms |

Parallel loading improves module LCP by 26% and lesson LCP by 10%. Both modes
produce identical SHA-256 hashes for all visible text and links. All nine
browser checks pass with parallel loading enabled.
