# Project Speed: Step 6 defer lesson video

Step 6 prevents the Mux player runtime and lesson stream from loading before a
student chooses to watch the lesson. Public Mux lessons initially render the
Mux thumbnail and a play control. The existing player is mounted after that
control is activated.

## Behavior and rollback

- Video completion still calls the existing `markLessonComplete` action.
- Completed lessons use the same deferred player behavior.
- Vimeo, missing videos and signed Mux assets keep their existing rendering.
- `PROJECT_SPEED_DEFER_LESSON_MUX=off` restores eager Mux mounting.

## Exit criteria

- The initial lesson request causes no Mux media requests.
- Starting a lesson mounts and autoplays the existing Mux player.
- The production lesson route transfers less JavaScript before interaction.
- The complete read-only production browser suite passes.

## Local A/B

Verified in a production build on 2026-07-15 with three fresh browser contexts
per mode:

| Mode | Initial JS | Requests | LCP p50 |
| --- | ---: | ---: | ---: |
| Eager Mux | 415.7 kB | 43 | 796 ms |
| Deferred Mux | 124.9 kB | 30 | 600 ms |

The deferred mode removes approximately 70% of initial lesson JavaScript and
13 requests. Lesson TTFB stayed effectively unchanged at 69 ms in both modes.

## Production result

The five-run production follow-up measured 120.1 kB of initial JavaScript and
30 requests on `/lessons/les-1-2`. The previous phase measured 397.2 kB and 43
requests on the same route. This confirms a 70% JavaScript reduction in
production. LCP remained effectively stable at 880 ms versus 868 ms before the
change.

All nine read-only production browser checks pass with
`PROJECT_SPEED_DEFER_LESSON_MUX=on`.
