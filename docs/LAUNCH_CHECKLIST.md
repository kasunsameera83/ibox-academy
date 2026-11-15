# iBox Academy — launch checklist

Work through this before promoting iboxacademy.com. Tick each item when it's done.
Items marked **Blocker** should be done before real learners pay.

## 1. Database (Supabase)

- [ ] **Blocker** Run every migration in `supabase/migrations/`, in order, up to `20261115120000_certificate_default.sql` (README lists them).
- [ ] Open **Advisors → Security Advisor** in the Supabase dashboard and fix anything marked as an error.
- [ ] Optional: run `supabase/tests/access_rules.sql` on a local or staging database. It runs 54 access checks for a visitor, a learner, staff and the Owner, prints PASS/FAIL, and rolls everything back. All 54 pass on the current migrations.
- [ ] Backups: check which backups your plan includes, and download a backup before launch day.

## 2. Sign-in (Supabase → Authentication)

- [ ] **Blocker** URL configuration: Site URL `https://iboxacademy.com`; redirect URLs include `https://iboxacademy.com/**`.
- [ ] **Blocker** Emails: the built-in Supabase email sender has a very low hourly limit and is meant for testing. Set up custom SMTP (for example Resend, Brevo or Amazon SES) before promoting the site, or sign-up and password-reset emails will stop arriving. Paste the branded templates from `supabase/templates/` (see its README).
- [ ] App emails (welcome, payment, bank transfer, support replies, certificates): add the `SMTP_*` and `EMAIL_FROM` settings in Vercel (see `.env.example`), redeploy, then check **Owner → Settings → Integrations → Email** shows connected and send a test.
- [ ] Email confirmation is on for new sign-ups.
- [ ] Password rules: minimum length 8 or more. Turn on leaked-password protection if your plan offers it.
- [ ] Multi-factor (TOTP) is enabled. It's required for the Owner and all staff.
- [ ] Google sign-in: the redirect URL in Google Cloud matches your Supabase callback, and the consent screen shows iBox Academy.
- [ ] Owner account: two-step sign-in set up, with the authenticator backed up on a second device.

## 3. Hosting (Vercel)

- [ ] **Blocker** Environment variables for Production. Set names only here; never paste the values into chat or code:
  `NEXT_PUBLIC_SITE_URL=https://iboxacademy.com`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`, `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_MODE`,
  `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_CDN_HOSTNAME`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_TOKEN_KEY`.
- [ ] No secret is in a `NEXT_PUBLIC_` variable.
- [ ] `www.iboxacademy.com` redirects to `iboxacademy.com` (or the other way round, but pick one).
- [ ] Preview deployments are protected (Vercel → Settings → Deployment Protection), so test builds aren't public.
- [ ] After deploying, check `https://iboxacademy.com/robots.txt` and `/sitemap.xml` open, then submit the sitemap in Google Search Console.

## 4. Payments

- [ ] **Blocker** Complete a full purchase in PayHere **sandbox** (`PAYHERE_MODE=sandbox`), then switch to `live`.
- [ ] PayHere live: your domain is approved, and the notify URL is `https://iboxacademy.com/api/payhere/notify`.
- [ ] Make one real small payment in live mode and check: order shows **Paid**, the course opens, and you get a notification.
- [ ] Bank transfer: bank details are filled in at Owner → Settings → Payments. Upload a test slip and approve it from a *different* account (you can't approve your own).
- [ ] Monthly habit: compare paid PayHere orders with your PayHere settlement report.
- [ ] If anyone who knew the PayHere secret leaves, change the secret in PayHere and Vercel.

## 5. Video (Bunny Stream)

- [ ] **Blocker** Token authentication is **on** for the library. Without it, paid videos can be played by anyone with the video ID.
- [ ] Allowed referrers / domains: `iboxacademy.com` only.
- [ ] Direct file (MP4) access is off, so videos only play in the player.
- [ ] Captions added where you have them.

## 6. Website content (Owner → Website)

- [ ] Menus & footer: real email, WhatsApp, phone, hours and social links, then publish.
- [ ] About, Contact, Help and Policies: replace every **[note in square brackets]**, then publish each page.
- [ ] Have the **Terms** and **Privacy** text checked by someone qualified before publishing.
- [ ] Homepage: publish once (even unchanged) so it's managed from the editor.
- [ ] Certificate design for each course (Course → Certificate).

## 7. Security header (after launch)

The site sends a *report-only* Content-Security-Policy. It doesn't block anything yet; the browser only logs what it **would** block.

- [ ] For about a week, open the browser console (F12 → Console) on the main pages: home, a course, checkout, a lesson with video, and the dashboards. Look for messages mentioning "Content-Security-Policy".
- [ ] Send me any messages you see. Once it's clean, we change `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `next.config.ts` to turn it on.

## 8. End-to-end test (one sitting, about 30 minutes)

Use a fresh learner account and a staff account with limited permissions.

1. Sign up, confirm email, sign in. Then sign in with Google.
2. Save a course to the wishlist, then buy it with PayHere sandbox. The course should open.
3. Buy another course by bank transfer and upload a slip. As the Owner, approve it.
4. Watch a lesson on a phone, do a quiz, and submit an assignment. As staff with review permission, approve it.
5. Finish the course and check the certificate link opens for someone signed out.
6. Open a support request. Reply as staff, add an internal note, and confirm the learner can't see the note.
7. As staff without finance permission, confirm Orders and Payments don't appear and can't be opened by URL.
8. Change the homepage hero in Website, preview it, publish, and check the live page.

## 9. Ongoing

- [ ] Watch Vercel → Logs for errors in the first days. Error pages show a **Reference** code that matches the log entry.
- [ ] A free uptime monitor (for example UptimeRobot) pinging the homepage every 5 minutes.
- [ ] Give staff only the permissions they need; review the list monthly.
- [ ] Still to build: ticket attachments and saved replies.
