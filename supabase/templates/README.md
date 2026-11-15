# Branded auth emails

Emails that Supabase sends for sign-in and account changes, styled for iBox Academy (yellow #FEC205 on near-black #131418).

## Before you paste

1. **Supabase → Authentication → URL Configuration → Site URL** must be `https://iboxacademy.com`. Every link is built from it.
2. **Authentication → Emails → SMTP Settings**: custom SMTP must be on (host `server.cloudmail.lk`, port 465, user `hello@iboxacademy.com`, sender name `iBox Academy`). Type the password into Supabase yourself.
3. **Authentication → Providers → Email → Email OTP Expiration** should stay at `3600` (1 hour). The emails say "expires in 1 hour".
4. The logo loads from `https://iboxacademy.com/brand/logo-email.png`, so deploy the site before sending test emails.

## Paste each template

Go to **Authentication → Emails → Templates**. For each one, set the subject, switch the body to source/HTML, delete what's there, and paste the whole file.

| Supabase template | Subject | File |
| --- | --- | --- |
| Confirm signup | Confirm your email | `confirm-signup.html` |
| Invite user | You're invited to iBox Academy | `invite.html` |
| Magic link | Your sign-in link | `magic-link.html` |
| Change email address | Confirm your new email | `change-email.html` |
| Reset password | Reset your password | `reset-password.html` |
| Reauthentication | Your verification code | `reauthentication.html` |

## Security alerts

These tell people when something important changes on their account, so they can act if it wasn't them. They're **off by default**. In **Authentication → Emails**, open the security notifications, switch each one on, set the subject and paste the file.

| Supabase notification | Subject | File |
| --- | --- | --- |
| Password changed | Your password was changed | `notify-password-changed.html` |
| Email address changed | Your email address was changed | `notify-email-changed.html` |
| Identity linked | A new sign-in method was added | `notify-identity-linked.html` |
| Identity unlinked | A sign-in method was removed | `notify-identity-unlinked.html` |
| MFA method added | Two-step sign-in was turned on | `notify-mfa-added.html` |
| MFA method removed | Two-step sign-in was removed | `notify-mfa-removed.html` |

Phone number changed isn't needed: iBox Academy doesn't use phone sign-in.

## How the links work

The links go to `/auth/callback?token_hash=…&type=…&next=…`, which the app already handles on the server. This works even if the link is opened in a different browser from the one the person signed up in, and it avoids putting sign-in tokens in the address bar.

Where each link lands: sign-up, magic link and email change go to `/app`; invites go to `/welcome`; password reset goes to `/reset-password`.

## Test

Sign up with a spare address, request a password reset, and invite a test staff member. Check each email in Gmail and Outlook (desktop and phone), click the button, and make sure you land signed in on the right page.
