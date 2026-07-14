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

The first run covered only public routes while the dedicated test student was
being prepared. The authenticated follow-up and verified compute regions are
recorded below.

### Authenticated baseline

Measured on 2026-07-14 with a dedicated test student and five fresh Chromium
contexts per route:

| Route | TTFB p50 / p95 | LCP p50 / p95 | JS transferred | Requests |
| --- | ---: | ---: | ---: | ---: |
| `/dashboard` | 856 / 1854 ms | 2668 / 3288 ms | 396.5 kB | 43-44 |
| `/modules` | 807 / 848 ms | 1532 / 1592 ms | 116.2 kB | 22 |
| `/account` | 604 / 761 ms | 680 / 840 ms | 116.1 kB | 16 |
| `/modules/program-design` | 620 / 724 ms | 1500 / 1824 ms | 116.2 kB | 28 |
| `/lessons/les-1-2` | 655 / 1457 ms | 1896 / 2456 ms | 397.3 kB | 41-42 |

The raw report is generated under `output/performance/` and remains local because
it can contain student-specific route slugs.

### Infrastructure finding

Supabase database compute is in AWS `eu-west-1` (Ireland), while Netlify reports
the site's Functions region as `us-east-2` (Ohio). Every authenticated page makes
multiple Supabase calls, so the cross-Atlantic roundtrips amplify TTFB. The target
Netlify Functions region is `dub` (Ireland); this setting is available on Netlify
Pro and Enterprise and requires a redeploy.

## Exit criteria

Step 1 is complete when:

1. Public checks pass against production and a deploy preview.
2. A dedicated test student can run all authenticated read-only checks.
3. Baseline reports exist for `/dashboard`, `/modules`, one module and one lesson.
4. Netlify and Supabase regions have been recorded and compared.
5. The baseline and expected behavior are approved before optimization work starts.
