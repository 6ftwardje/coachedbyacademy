# Project Speed: Step 3 verified auth context

Step 3 removes the duplicate Supabase Auth lookup on protected requests. The
middleware still verifies and refreshes the session through `auth.getUser()`,
then passes only the verified user ID to the server render.

## Trust model

- Middleware removes any incoming internal auth header before doing other work.
- The internal header is added only after Supabase returns a verified user.
- Anonymous requests with a forged header still redirect to login.
- Row Level Security remains active for every student and course query.
- Server actions or routes without verified middleware context fall back to
  `auth.getUser()`.
- New users without a student row retain the existing bootstrap flow.

The middleware also preserves refreshed Supabase cookies when it rebuilds the
request context or redirects.

## Static intro video

The known public Mux playback ID is configured as
`HOME_INTRO_MUX_PLAYBACK_ID` in the Netlify production context. Dashboard
renders no longer need to call the Mux API to discover this unchanged value.

## Verification

Verified locally on 2026-07-14:

- Production build and TypeScript checks succeed.
- All 8 public and authenticated read-only browser tests pass.
- The forged internal-header regression test redirects to login.
- Protected request logs contain `student.query` but no second
  `server.auth.getUser` call.
- A warm local dashboard request completed in approximately 146 ms.

## Rollback

Revert the middleware and student resolver commit to restore the duplicate
server auth lookup. Remove `HOME_INTRO_MUX_PLAYBACK_ID` to restore dynamic Mux
asset discovery. Neither rollback requires a database migration.

## Exit criteria

Step 3 is complete when the production deploy passes all read-only tests and
production logs confirm that protected renders no longer call
`server.auth.getUser` after middleware verification.
