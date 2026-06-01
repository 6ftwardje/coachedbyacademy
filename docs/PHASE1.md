# CoachedBy Academy – Phase 1 Summary

## Created files

### Config & root
- `package.json` – Next.js 15, React 19, TypeScript, Tailwind, @supabase/ssr, @supabase/supabase-js
- `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `next-env.d.ts`
- `middleware.ts` – runs Supabase session refresh and protects routes
- `.env.example` – Supabase env vars

### App router
- `app/layout.tsx` – root layout (Geist font, metadata)
- `app/globals.css` – Tailwind + CSS variables (light/dark)
- `app/page.tsx` – public registration and login page
- `app/login/page.tsx` – redirects old login bookmarks to `/`
- `app/account/update-password/page.tsx` – protected password recovery form
- `app/auth/callback/route.ts` – OAuth/code exchange, redirect to `next`
- `app/auth/signout/route.ts` – POST sign out, redirect to /
- `app/(protected)/layout.tsx` – ensures student, wraps in AppShell
- `app/(protected)/dashboard/page.tsx` – welcome, stats cards, module grid
- `app/(protected)/dashboard/loading.tsx`
- `app/(protected)/modules/page.tsx` – published modules list
- `app/(protected)/modules/loading.tsx`
- `app/(protected)/modules/[slug]/page.tsx` – module detail + lessons list
- `app/(protected)/modules/[slug]/loading.tsx`
- `app/(protected)/account/page.tsx` – email/name, sign out
- `app/(protected)/account/loading.tsx`

### Lib
- `lib/types.ts` – Student, Module, Lesson, DashboardStats
- `lib/supabase/client.ts` – browser client (createBrowserClient)
- `lib/supabase/server.ts` – server client (createServerClient + cookies)
- `lib/supabase/middleware.ts` – updateSession (getUser, redirect if protected + no user)
- `lib/supabase/admin.ts` – placeholder (no usage in phase 1)
- `lib/students.ts` – getCurrentAuthUser, getCurrentStudent, ensureCurrentStudent
- `lib/modules.ts` – getPublishedModules, getModuleBySlug
- `lib/lessons.ts` – getPublishedLessonsByModuleId, getLessonCountByModuleId
- `lib/dashboard.ts` – getDashboardStats

### Components
- `components/AppShell.tsx` – client: topbar, sidebar (desktop), horizontal nav (mobile), content area, sign out

### Docs
- `docs/PHASE1.md` – this file

---

## Route structure

| Path | Protection | Purpose |
|------|------------|--------|
| `/` | Public | Registration, password login and resetmail request |
| `/login` | Public | Redirect to `/`; preserves `redirectedFrom` |
| `/auth/callback` | Public | Exchange code for session; redirect to `next` |
| `/auth/signout` | POST only | Sign out, redirect to `/` |
| `/account/update-password` | Authenticated session | Choose a new password after resetmail |
| `/dashboard` | Protected | Welcome, stats, module grid |
| `/modules` | Protected | All published modules |
| `/modules/[slug]` | Protected | One module + its lessons |
| `/account` | Protected | Profile view, sign out |

Protected routes live under `app/(protected)/`. The group layout runs first; middleware has already ensured a session for these paths.

---

## Where auth happens

1. **Middleware** (`middleware.ts` → `lib/supabase/middleware.ts`)
   - Runs on every request (except static assets).
   - Uses `createServerClient` with request/response cookies to refresh the session.
   - If path is `/dashboard`, `/modules`, `/modules/*`, or `/account` and there is no user, redirects to `/?redirectedFrom=<path>`.

2. **Protected layout** (`app/(protected)/layout.tsx`)
   - Calls `ensureCurrentStudent()` (server).
   - If no student (and bootstrap fails), redirects to login.
   - Renders `AppShell` with student name; children are dashboard, modules, account.

3. **Registration, login and password recovery**
   - Client: `components/auth/StudentAuthForm.tsx` uses `createClient()` from `lib/supabase/client.ts`.
   - Registration calls `signUp`; login calls `signInWithPassword`; password recovery calls `resetPasswordForEmail`.
   - Server: `app/auth/callback/route.ts` exchanges confirmation and recovery codes for a session, then redirects to an internal `next` path.

4. **Sign out**
   - Form POST to `/auth/signout`; route uses server client `signOut()` and redirects to `/`.

---

## Student bootstrap

- **Source of truth:** Supabase Auth session + `students` table. No localStorage.
- **Flow:**
  1. User confirms registration or signs in with a password -> session exists.
  2. Any protected page is wrapped by `(protected)/layout.tsx`, which calls `ensureCurrentStudent()`.
  3. `ensureCurrentStudent()` in `lib/students.ts`:
     - Gets current auth user via `getCurrentAuthUser()` (server `getUser()`).
     - Looks up `students` where `auth_user_id = user.id`.
     - If found, returns that student.
     - If not found, **inserts** a new row: `auth_user_id`, `email`, `name` (from `user_metadata.full_name` or `name`), and relies on DB default for `access_level`.
  4. Layout gets back the student and passes `student.name` to AppShell; pages can call `getCurrentStudent()` or `ensureCurrentStudent()` again if they need the student (e.g. dashboard welcome, account page).
- **Where it runs:** In the protected layout (server), so every protected view gets a bootstrapped student without extra client logic.

---

## Intentionally left for phase 2

- **Exams** – No exam pages or taking exams.
- **Lesson video playback** – No video player; lesson list only with “Available” badge.
- **Progress tracking** – No `progress` reads/writes; no “completed” state per lesson.
- **Module/lesson locking** – No gating by progress or exam results; all published content is visible.
- **Payments** – No payment or subscription logic.
- **Admin dashboard** – No admin UI.
- **Profile editing** – Account page is read-only; no edit form for name/phone.
- **StudentProvider** – No client-side student context; server data is enough for phase 1.

The code is structured so that:
- Lesson rows can later link to a lesson detail page with a video player.
- Module detail can later show progress and lock lessons/exam based on `progress` and `exam_results`.
- Data layer (modules, lessons, dashboard) is centralized and typed for easy extension.
