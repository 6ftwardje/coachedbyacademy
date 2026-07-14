# Project Speed: Step 4 EU runtime and shared course read model

Step 4 moves Netlify Functions from Ohio to Dublin and reuses the student
course RPC for the modules overview.

## Region alignment

The Netlify Pro upgrade made selectable Functions regions available. The site
setting is now `dub`, and the deployed Next.js server function reports
`eu-west-1`. Supabase is also hosted in `eu-west-1`.

After the region-only redeploy, production TTFB p50 changed as follows:

| Route | Before | Dublin |
| --- | ---: | ---: |
| `/modules` | 534 ms | 442 ms |
| `/account` | 678 ms | 457 ms |
| `/modules/program-design` | 541 ms | 446 ms |
| `/lessons/les-1-2` | 489 ms | 428 ms |

The dashboard run contained one large network or cold-start outlier, so its
region result is not used as proof of improvement.

## Shared course data

`student-course-data.ts` owns the raw RPC payload, access scope, exam map,
progress map and sequential module gate. Both the dashboard and modules page
now use this shared implementation.

With `PROJECT_SPEED_MODULES_RPC=on`, `/modules` can replace its chained module,
access, lesson-count, exam and result reads with one Supabase call. An RPC error
automatically falls back to the legacy implementation.

## Verification

Verified locally on 2026-07-14:

- Production build and TypeScript checks succeed.
- All 8 read-only browser tests pass in legacy and RPC modes.
- Legacy and RPC module pages have the same text-and-link SHA-256 hash.
- A warm internal modules query decreased from approximately 258 ms to 60 ms.

After the Dublin move, a targeted 15-run production A/B showed a different
route-level result:

| Mode | TTFB p50 | Slowest run |
| --- | ---: | ---: |
| Shared RPC on | 435 ms | 892 ms |
| Shared RPC off | 407 ms | 921 ms |

With the database and function now co-located, parallel small reads are slightly
faster at the browser than the larger combined payload. Production therefore
keeps `PROJECT_SPEED_MODULES_RPC=off`. The shared adapter remains useful for the
dashboard and as an explicitly reversible experiment, but is not claimed as a
modules-page speed improvement.

## Rollback

Production is already set to `PROJECT_SPEED_MODULES_RPC=off`. The shared
dashboard adapter and Dublin Functions region are independent and remain
active.

## Exit criteria

Step 4 is complete when the production deploy reports `eu-west-1`, all browser
tests pass, both modules modes have been compared in production and the faster
mode remains active.
