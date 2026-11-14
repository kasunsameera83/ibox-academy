# iBox Academy — online learning platform

Sri Lanka-first learning platform. Next.js (App Router) + TypeScript + Supabase + Tailwind CSS.
Product spec: the UI/UX blueprint PDF. Build plan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Rebranding — everything is in one place

| What | Where |
|---|---|
| App name, tagline, description, logo/icon paths, contact details, social links | `src/brand/brand.config.ts` |
| Colours, radius, shadows | `src/brand/tokens.css` |
| Font | `src/brand/fonts.ts` |
| Logo / favicon image files | `public/brand/` |
| Home page text (until the CMS arrives in Phase 2) | `src/config/home-content.ts` |

Components never use raw colours or the brand name directly — they read from these files.

## First-time setup (Windows)

1. **Install Node.js 22 LTS** from nodejs.org (if not installed). Check with `node -v`.
2. **Install packages** — open a terminal in `E:\Kova Apps\Kivora` and run:
   ```
   npm install
   ```
3. **Create a Supabase project** at supabase.com (region: South Asia (Mumbai) is closest to Sri Lanka; otherwise Singapore).
4. **Create the database** — in Supabase open **SQL Editor** and run each file in
   `supabase/migrations/` **in order** (paste the whole file, click **Run**):
   1. `20261114000000_foundation.sql`
   2. `20261114010000_courses.sql`
   3. `20261114020000_lesson_types.sql`
   4. `20261114030000_course_intro_video.sql`
   5. `20261114040000_mfa_enforcement.sql`
   6. `20261114050000_orders_enrolments.sql`
   7. `20261114060000_notifications.sql`
   8. `20261114070000_learning.sql`
   9. `20261114080000_assignment_reviews.sql`
   10. `20261114090000_certificate_design.sql`
   11. `20261114100000_people_admin.sql`
   12. `20261114110000_promotions.sql`
   13. `20261114120000_reports.sql`
   14. `20261114130000_security_hardening.sql` (no self-approval of payments, hidden video IDs, server-only audit log)
5. **Environment variables** — copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (Supabase → Project Settings → API Keys).
6. **Auth URLs** — Supabase → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
7. **Email templates** (optional for now). The app works with Supabase's standard emails:
   sign-up and password links open in the same browser, and staff invites land on `/auth/accept`.
   New free-plan projects can only edit templates after setting up custom SMTP
   (Supabase → Authentication → Emails → SMTP Settings; Brevo or Resend have free tiers).
   Once that's on, change these links so they also work on another device:
   - *Confirm signup*: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/app`
   - *Reset password*: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   - *Invite user*: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/welcome`
8. **Google sign-in** — create an OAuth client in Google Cloud Console (Web application), add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI, then paste
   the client ID and secret into Supabase → Authentication → Sign In / Providers → Google.
9. **Run it**:
   ```
   npm run dev
   ```
   Open http://localhost:3000, sign up, confirm your email.
10. **Make yourself the Owner** — in the SQL Editor run (with your email):
    ```sql
    update public.profiles set role = 'owner'
    where id = (select id from auth.users where email = 'you@example.com');
    ```
    Sign out and in again; you'll land in `/app/owner`.

## Video hosting (Bunny Stream)

Add the four `BUNNY_STREAM_*` values to `.env.local` (see `.env.example`) and restart `npm run dev`.
In the Bunny library's **Security** settings: direct play off, block direct URL access on, embed view
token authentication on, CDN token authentication on, and add your site's domain to **Allowed domains**.

## Payments (PayHere + bank transfer)

- Owner → Settings → Payments: enter your bank details to switch on bank transfer.
- Add `SUPABASE_SECRET_KEY`, `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET` and `PAYHERE_MODE=sandbox`
  to `.env.local` to switch on card payments.
- PayHere confirms payments by calling `/api/payhere/notify` on your site. It can't reach `localhost`,
  so to test card payments locally run a tunnel (e.g. `npx cloudflared tunnel --url http://localhost:3000`),
  set `NEXT_PUBLIC_SITE_URL` to the tunnel address, and add that domain in PayHere's sandbox settings.

## Two-step verification

The Owner account must use an authenticator app. If the Owner loses their phone, reset it in
Supabase → Authentication → Users → (user) → remove the MFA factor, then sign in and set it up again.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production build
- `npm run typecheck` — TypeScript check

## Security model (summary)

- `src/proxy.ts` refreshes the session and sends signed-out visitors to `/login`.
- `src/lib/dal/session.ts` verifies the user (`getClaims()`) and role/permissions in every
  workspace layout, page and Server Action.
- Postgres RLS + column grants enforce the same rules in the database. New users are always
  `student`; roles can't be changed from the browser.
- Never put secret keys in `NEXT_PUBLIC_*` variables.
