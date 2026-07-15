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

The production blocking-layout reference is 473 ms p50 over 15 fresh dashboard
contexts. The flag remains active only if the equivalent production streaming
run improves this result without functional regressions.

## Exit criteria

Step 5 is complete when both modes have been compared over 15 production runs,
all browser tests pass on the selected mode and the final Netlify flag matches
the faster result.
