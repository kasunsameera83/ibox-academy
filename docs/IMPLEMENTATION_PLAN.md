# iBox Academy — Implementation Plan

Source of truth: *Online Learning Platform — UI/UX + Security Design Blueprint v1.0 (14 Nov 2026)*.
This plan adds the Owner's confirmed decisions (14 Nov 2026) and turns the blueprint into a build sequence.

## 1. Confirmed decisions

| Topic | Decision |
|---|---|
| Brand | **iBox Academy** (domain iboxacademy.com; formerly provisional "Kivora"). Name, logo, icon, colours, font and contact details live in `src/brand/` only. Owner can override brand values from the dashboard later (Phase 2, `site_settings`). |
| Roles | Owner, Staff, Student. **No instructors now.** The role enum and course `created_by` are designed so an external Instructor role can be added later without a rewrite. |
| Course creation | Owner only (Staff with content permissions optional). |
| Font | Plus Jakarta Sans (system sans fallback). Sinhala/Tamil fonts added with localisation. |
| Course access | Set **per course by the Owner**: lifetime, or a fixed number of days from enrolment. |
| Checkout | One course per purchase (no cart in v1). |
| Payments | **PayHere** (cards/online) and **bank transfer** (slip upload → staff/Owner verification). No Stripe. |
| Video | **Bunny Stream** with signed/token-authenticated playback. No paid video in public buckets. |
| Certificates | Issued when **100% of lessons** are completed; public verification link. |
| Sign-in | Email + password, and Google. MFA (TOTP) required for Owner and privileged Staff. |
| Refunds | Manual: approved in dashboard, money returned via PayHere merchant portal or bank transfer, then marked refunded. |
| Languages | English at launch; UI strings structured for Sinhala and Tamil. |
| Currency / TZ | LKR, Asia/Colombo. |

## 2. Route map

### Public
| Route | Screen | Phase |
|---|---|---|
| `/` | Home (CMS-driven sections) | 1 (static) → 2 (CMS) |
| `/courses` | Explore: search, filters, sort, grid | 2 |
| `/categories/[slug]` | Category page | 2 |
| `/courses/[slug]` | Course detail + sticky purchase panel | 2 |
| `/checkout/[courseSlug]` | Review → method (PayHere / bank transfer) → result | 3 |
| `/checkout/result/[orderRef]` | Pending / Paid / Failed / Under review | 3 |
| `/certificates/verify/[code]` | Public certificate verification | 3 |
| `/about` `/contact` `/help` `/policies/[slug]` | CMS pages | 2 |

### Auth
`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` (OAuth + email links), `/auth/mfa` (Phase 1b), `/access-denied`.

### Student — `/app/student`
Overview · `learning` (My Learning) · `learn/[courseSlug]/[lessonId]` (player) · `wishlist` · `certificates` · `payments` · `notifications` · `help` · `settings` (profile, security, sessions).

### Staff — `/app/staff` (modules appear only when granted)
Workspace · `tasks` · `content` · `learners` · `orders` · `support` · `reports` · `settings`.

### Owner — `/app/owner`
Overview · `website` · `courses` · `categories` · `students` · `staff` · `orders` · `payments` · `promotions` · `support` · `reports` · `security` · `settings`.

## 3. Data entities (Supabase Postgres, RLS on every table)

| Entity | Key fields | Phase |
|---|---|---|
| `profiles` | id (auth user), email, full_name, avatar_url, role, status, locale | 1 ✅ |
| `permissions` / `staff_permissions` | permission catalogue; per-staff grants | 1 ✅ |
| `site_settings` | key, value (jsonb), is_public — brand overrides, contact, bank account details | 1 ✅ |
| `audit_events` | actor, action, target, outcome, redacted metadata (append-only) | 1 ✅ |
| `cms_pages`, `cms_page_versions`, `media_assets` | route, sections jsonb, status, versions, alt text | 2 |
| `categories` | slug, name, parent, image, order, visibility, SEO | 2 |
| `courses` | slug, title, summary, description, category, level, language, outcomes, prerequisites, price_lkr, sale_price_lkr, access_type (lifetime / fixed_days), access_days, status, SEO, created_by | 2 |
| `course_sections`, `lessons` | order, title, type, duration, is_preview, bunny_video_id, captions | 2 |
| `lesson_resources` | private storage path, file type, size | 2 |
| `orders` | reference, student, course, amount_lkr, method (payhere / bank_transfer), status, provider_ref, timestamps | 3 |
| `payment_events` | raw verified PayHere notifications (idempotency by payment_id) | 3 |
| `bank_transfer_slips` | order, private file path, reviewed_by, decision, reason | 3 |
| `enrolments` | student, course, order, starts_at, expires_at, status | 3 |
| `lesson_progress` | student, lesson, position_seconds, completed_at | 3 |
| `notes_bookmarks` | student, lesson, timestamp, body (private) | 3 |
| `certificates` | student, course, verification code, issued_at | 3 |
| `wishlist_items`, `reviews` | — | 3 |
| `coupons`, `coupon_redemptions` | — | 4 |
| `support_tickets`, `ticket_messages` (public / internal flag) | — | 4 |
| `refund_requests` | order, reason, decision, processed_by | 4 |

### Status vocabulary (from blueprint §11)
- Course: draft · in_review · changes_requested · scheduled · published · unpublished · archived
- Order: pending · under_review (bank transfer awaiting check) · paid · failed · cancelled · partially_refunded · refunded
- Enrolment: not_started · in_progress · completed · expired · revoked
- Staff: invited · active · suspended · deactivated

## 4. Permission matrix

Owner has every permission implicitly. Staff get nothing by default except their workspace and profile. Sensitive permissions (★) are granted individually and audited.

| Group | Permission keys |
|---|---|
| Content | courses.read, courses.create, courses.edit, courses.upload, courses.submit_review, courses.publish ★ |
| Learners | students.read, students.update_limited, students.suspend ★ |
| Finance | orders.read, payments.read, payments.verify_bank_transfer ★, refunds.request, refunds.approve ★, exports.finance ★ |
| Support | tickets.read, tickets.reply, tickets.assign, tickets.close |
| Website | cms.read, cms.edit_draft, cms.publish ★ |
| Reports | reports.read |
| Security | audit.read ★, sessions.revoke ★ |

Owner-only (never grantable): staff/role management, global settings, payment provider settings, brand settings.

Enforcement layers: `proxy.ts` (session refresh + sign-in redirect) → server Data Access Layer (`src/lib/dal`) in every layout, page and Server Action → Postgres RLS + column grants. Hiding a menu item is never the control.

## 5. Payment flows

**PayHere:** create order `pending` → server builds signed checkout (merchant secret server-only) → PayHere → `notify_url` route verifies `md5sig`, amount, currency and merchant ID → idempotent update to `paid` → enrolment created → learner sees verified state. The browser return URL never unlocks a course.

**Bank transfer:** create order `pending` with unique reference → show bank details (from `site_settings`) → learner uploads slip (private bucket, type/size validated) → `under_review` → staff with `payments.verify_bank_transfer` or Owner approves (enrolment created) or rejects with reason → audit event → learner notified. Unpaid orders expire after a configurable number of days.

## 6. Phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **1. Foundation** | Brand module + tokens, component kit, responsive shells, auth (email/password, Google, reset), role model, DB foundation + RLS. **1b:** MFA for Owner/privileged Staff, sessions page. | Shared UI kit and role-guarded route skeleton running. |
| 2. Public experience | Categories, courses data model, Owner course builder (basic), CMS home + pages, explore/search, course detail, Bunny upload + preview. | Owner can publish a course and edit the home page. |
| 3. Student journey | Checkout (PayHere + bank transfer), enrolments, player with progress, My Learning, certificates, payments history, wishlist, reviews. | Learner can buy, start, resume and complete a course. |
| 4. Owner operations | Students, staff invites + permission editor, orders/payments/refunds, promotions, support, reports, security/audit, settings. | Owner runs the business without other admin tools. |
| 5. Staff operations | Permission-scoped workspace, task queues, content/support/finance screens. | Staff workflows restricted and auditable. |
| 6. Hardening | Accessibility, responsive QA, RLS tests (anon/student/staff/owner), payment + video integration tests, security review. | No critical bypass or launch-blocking issue. |

## 7. Still needed from the Owner (before the phase that uses it)

- Phase 2: Bunny Stream account (library ID, API key, token-auth key).
- Phase 3: PayHere merchant ID + secret (sandbox first), bank account details for transfers, refund policy text, certificate design preference.
- Phase 4: Email sending domain (e.g. Resend), support contact channels.
- Before launch: trademark check for "iBox Academy" (NIPO Sri Lanka), social handles, legal pages reviewed locally.
