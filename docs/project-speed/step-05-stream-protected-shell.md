# Project Speed: Step 5 stream the protected shell

Step 5 moves the blocking student gate inside a React Suspense boundary. The
verified app shell and route loading state can stream while Supabase resolves
the student and page data.

## Behavior and authorization

- Middleware still verifies every protected request with Supabase Auth.
- `ProtectedStudentGate` still redirects when the student lookup fails.
- Student bootstrap behavior remains in `ensureCurrentStudent`.
- Admin navigation resolves asynchronously from the same cached student lookup.
- Admin pages and actions continue to use the separate `requireAdmin` database
  authorization check.
- `PROJECT_SPEED_STREAM_PROTECTED_SHELL=off` restores the blocking layout.

## Verification

Verified locally in production mode on 2026-07-15:

- Production build and TypeScript checks succeed.
- All 8 read-only browser tests pass with streaming enabled.
- Blocking and streaming layouts have the same final text-and-link SHA-256 hash.
- Dashboard TTFB p50 decreased from approximately 144 ms to 62 ms over ten
  local runs.

The targeted production A/B used 15 fresh dashboard contexts per mode:

| Mode | TTFB p50 | Slowest run |
| --- | ---: | ---: |
| Blocking layout | 473 ms | 681 ms |
| Streaming layout | 404 ms | 3070 ms |

Streaming improves normal TTFB by approximately 15%. One Netlify or upstream
cold-start outlier remains; streaming reduces the common wait but does not
eliminate infrastructure spikes.

The five-run full-route follow-up with streaming enabled measured:

| Route | TTFB p50 | LCP p50 |
| --- | ---: | ---: |
| `/dashboard` | 409 ms | 620 ms |
| `/modules` | 408 ms | 572 ms |
| `/account` | 459 ms | 536 ms |
| `/modules/program-design` | 439 ms | 640 ms |
| `/lessons/les-1-2` | 382 ms | 868 ms |

The streamed response adds one RSC request and approximately 20 kB of transfer
per route. It does not add browser console errors or client-side layout shift.
Production keeps `PROJECT_SPEED_STREAM_PROTECTED_SHELL=on`.

## Exit criteria

Step 5 is complete when both modes have been compared over 15 production runs,
all browser tests pass on the selected mode and the final Netlify flag matches
the faster result.
