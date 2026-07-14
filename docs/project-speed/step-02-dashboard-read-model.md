# Project Speed: Step 2 dashboard read model

Step 2 replaces the dashboard's chained Supabase reads with one read-only RPC.
The existing TypeScript business rules still determine module visibility,
progress, locking and the next step.

## Rollout

1. Apply `20260714000000_project_speed_dashboard_read_model.sql`.
2. Deploy the application with `PROJECT_SPEED_DASHBOARD_RPC=off`.
3. Run the read-only browser suite against the deploy.
4. Set `PROJECT_SPEED_DASHBOARD_RPC=on` and redeploy.
5. Run the suite and production baseline again.

The application automatically falls back to the legacy queries when the RPC is
missing or returns an error. Set the environment variable to `off` and redeploy
for an immediate rollback.

## Verification

Verified locally on 2026-07-14 with the dedicated test student:

- Production build succeeds.
- All 7 public and authenticated read-only browser tests pass in both modes.
- Dashboard text and link output have the same SHA-256 hash in both modes.
- A request for another student ID returns `null`.
- The RPC is `security invoker` and executable only by `authenticated` and
  `service_role` database roles.
- A warm dashboard query decreased from approximately 213 ms to 54 ms locally.

Local timings are directional. The production baseline remains authoritative
because Netlify Functions and Supabase run in different regions.

## Exit criteria

Step 2 is complete when the production deploy passes all read-only tests, the
dashboard RPC is active, and production TTFB has been measured against the Step
1 baseline.
