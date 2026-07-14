# Project Speed: Step 1 baseline

Step 1 adds repeatable measurements and read-only smoke tests before changing the
application architecture. Generated reports are written to `output/` and are not
committed.

## Safety rules

- Production checks are read-only by default.
- Use a dedicated test student, never a real student's account.
- Do not add `E2E_EMAIL` or `E2E_PASSWORD` to Git.
- Mutating progress and exam checks require `E2E_ALLOW_MUTATIONS=true`; no such
  checks are enabled in this step.
- Database migrations remain additive throughout Project Speed.

## Commands

Run public production smoke tests:

```bash
npm run test:e2e:production
```

Run the public production performance baseline five times:

```bash
npm run perf:baseline
```

Include authenticated, read-only routes with a dedicated test student:

```bash
E2E_EMAIL="..." E2E_PASSWORD="..." npm run test:e2e:production
E2E_EMAIL="..." E2E_PASSWORD="..." npm run perf:baseline
```

Override the target for a Netlify deploy preview:

```bash
E2E_BASE_URL="https://deploy-preview-url.netlify.app" npm run test:e2e
```

## Metrics captured

The baseline runner records raw runs and p50/p95 values per route for TTFB, FCP,
LCP, DOM ready, load time, transferred bytes, JavaScript bytes and request count.
It also captures CLS, long tasks and browser console errors.

Existing server measurements now emit structured `[perf]` JSON in Netlify logs.
This keeps timings parseable while preserving the behavior of `timeAsync`.

## Initial production baseline

Measured on 2026-07-14 against `https://coachedbycourse.netlify.app` with five
fresh Chromium contexts at 1440 by 1000 pixels:

| Route | Metric | p50 | p95 |
| --- | --- | ---: | ---: |
| `/` | TTFB | 79.7 ms | 101.7 ms |
| `/` | FCP | 240 ms | 264 ms |
| `/` | LCP | 240 ms | 264 ms |
| `/` | transferred | 201.1 kB | 201.1 kB |
| `/` | JavaScript transferred | 157.8 kB | 157.8 kB |
| `/` | requests | 12 | 12 |

The production build reports `327 kB` First Load JS for `/dashboard`, compared
with `115 kB` for `/modules`. This is the first concrete optimization target for
step 2.

Authenticated routes are intentionally not included until a dedicated test
student is available. The public Supabase endpoint currently terminates at the
Cloudflare Brussels edge (`BRU`), but that does not reveal the database origin
region. Netlify CLI access and the Supabase dashboard are required to verify the
two compute regions conclusively.

## Exit criteria

Step 1 is complete when:

1. Public checks pass against production and a deploy preview.
2. A dedicated test student can run all authenticated read-only checks.
3. Baseline reports exist for `/dashboard`, `/modules`, one module and one lesson.
4. Netlify and Supabase regions have been recorded and compared.
5. The baseline and expected behavior are approved before optimization work starts.
