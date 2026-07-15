# Project Speed: Step 7 local auth claims

Step 7 replaces the mandatory Auth server lookup on every protected navigation
with Supabase `getClaims()` behind a production feature flag.

## Trust model

- Supabase verifies the access-token signature before claims are accepted.
- Asymmetric signing keys use WebCrypto and Supabase's cached JWKS endpoint.
- Projects with legacy symmetric keys automatically fall back to `getUser()`.
- Middleware still removes forged internal auth headers before verification.
- Anonymous and invalid sessions keep the existing login redirects.
- Refreshed cookies are still copied to the request and response.
- Database authorization remains enforced by Row Level Security.
- `PROJECT_SPEED_LOCAL_AUTH_CLAIMS=off` restores the explicit `getUser()` call.

## Exit criteria

- The protected-route and forged-header browser checks pass in both modes.
- Logs prove whether this Supabase project verifies claims locally.
- A production A/B shows a lower protected-route TTFB before enabling the flag.

## Local A/B

Verified in a production build on 2026-07-15 with five fresh browser contexts
per route. The first JWKS request took 553 ms; warmed signature verification
then completed in 1-5 ms.

| Route | `getUser` TTFB p50 | `getClaims` TTFB p50 |
| --- | ---: | ---: |
| `/dashboard` | 95.3 ms | 9.0 ms |
| `/modules` | 73.3 ms | 8.7 ms |
| `/account` | 70.3 ms | 8.6 ms |
| `/modules/program-design` | 77.0 ms | 9.4 ms |
| `/lessons/les-1-2` | 71.1 ms | 8.7 ms |

All nine browser checks pass with local claim verification enabled.

## Production result

A targeted 15-run dashboard A/B on the same commit measured:

| Mode | TTFB p50 | Slowest run |
| --- | ---: | ---: |
| Auth server `getUser` | 748.4 ms | 973.5 ms |
| Local `getClaims` | 725.3 ms | 841.7 ms |

The controlled result improves median TTFB by 3% and the slowest observed run
by 14%. A separate five-run full-route follow-up measured these TTFB medians:

| Route | TTFB p50 |
| --- | ---: |
| `/dashboard` | 507.2 ms |
| `/modules` | 570.6 ms |
| `/account` | 596.5 ms |
| `/modules/program-design` | 611.4 ms |
| `/lessons/les-1-2` | 435.9 ms |

All nine production browser checks pass. Production keeps
`PROJECT_SPEED_LOCAL_AUTH_CLAIMS=on`.
