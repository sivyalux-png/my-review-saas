This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase authentication

Dashboard pages under `/dashboard` require a valid Supabase Auth session. The
request proxy refreshes Supabase cookies and redirects signed-out visitors to
`/login`; the dashboard layout also verifies the session before rendering.

1. Create or open a project in Supabase.
2. Copy `.env.example` to `.env.local`.
3. In the Supabase project settings, copy the **Project URL** and **publishable
   key** into `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
4. Set `NEXT_PUBLIC_SITE_URL` to the app's canonical URL (`http://localhost:3000`
   locally). Add that URL plus `/auth/callback` to Supabase **Authentication →
   URL Configuration → Redirect URLs**.
5. Copy the Supabase **service_role** key to `SUPABASE_SERVICE_ROLE_KEY` and
   generate a random secret of at least 32 bytes for
   `APPSUMO_LICENSE_HMAC_SECRET` (for example,
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`).
   These are server-only variables: never use the `NEXT_PUBLIC_` prefix for
   them or expose their values to the browser.
6. Generate a base64-encoded 32-byte key for
   `EMAIL_CREDENTIALS_ENCRYPTION_KEY` with
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
   A 64-character hexadecimal key is also accepted. Put the value in `.env.local`
   for local development and restart the dev server. Set the same stable secret
   in production's environment variables and redeploy. Do not change or lose
   this key after users have saved credentials, or those credentials cannot be
   decrypted. The Settings page validates this key before allowing Resend
   credentials to be saved and displays setup instructions if it is missing or
   invalid.
   Set a separate random value of at least 32 bytes for `CRON_SECRET`; these
   protect stored BYOS credentials and scheduled follow-up delivery.
7. In Resend, verify a sending domain and set the server-only
   `RESEND_API_KEY` and `RESEND_FROM_EMAIL` variables. Set
   `RESEND_FROM_EMAIL` to an address on that verified domain (for example,
   `reviews@your-verified-domain.com`). Review request emails use the
   workspace's business name as the sender display name.
8. Add these variables in Vercel under **Project Settings → Environment
   Variables**, using the correct site URL for each environment, then restart
   the local development server or redeploy.

Only use the Supabase publishable key in these `NEXT_PUBLIC_` variables. Never
put a Supabase secret or service-role key in browser-visible configuration.
Email signup creates a Supabase Auth user, profile, and default business
location. New accounts start with 30 system email credits. AppSumo license
codes are optional at signup and can be redeemed later from Plan & credits.
If email confirmation is enabled, open the confirmation link in the same
browser to finish signup and, when provided, activate the pending license.

## Supabase database schema

The initial database schema is in
[`supabase/migrations/01_initial_schema.sql`](./supabase/migrations/01_initial_schema.sql).
After applying that initial schema, also run
[`supabase/migrations/02_redeem_licenses.sql`](./supabase/migrations/02_redeem_licenses.sql)
in your project's **SQL Editor**. It adds the atomic, authenticated
`redeem_license` function. Then run
[`supabase/migrations/03_license_entitlements.sql`](./supabase/migrations/03_license_entitlements.sql)
to add persisted plan and credit balances to profiles and update the redemption
function. Apply migrations
[`supabase/migrations/04_review_requests.sql`](./supabase/migrations/04_review_requests.sql),
[`supabase/migrations/05_bulk_review_requests.sql`](./supabase/migrations/05_bulk_review_requests.sql),
and
[`supabase/migrations/06_public_review_page.sql`](./supabase/migrations/06_public_review_page.sql)
for persistent review requests, imports, and public customer feedback. Finally,
apply
[`supabase/migrations/07_appsumo_channel_entitlements.sql`](./supabase/migrations/07_appsumo_channel_entitlements.sql)
to grant Tier 1 1,000 email credits, Tier 2 5,000 email credits, and Tier 3
10,000 email credits. This migration updates the redemption function and
backfills existing redeemed licenses while preserving previously consumed
email credits. Then apply
[`supabase/migrations/08_reconcile_review_and_entitlement_columns.sql`](./supabase/migrations/08_reconcile_review_and_entitlement_columns.sql)
to safely add any missing entitlement, settings, license, or review-request
columns. It is safe to rerun, but does not replace migrations 01–07 or recreate
their functions and policies. Then run
[`supabase/migrations/09_review_email_request_id.sql`](./supabase/migrations/09_review_email_request_id.sql)
to return the created request ID and credit balance. Apply
[`supabase/migrations/10_fix_review_request_credits_ambiguity.sql`](./supabase/migrations/10_fix_review_request_credits_ambiguity.sql)
after migration 09 to replace any `create_review_request` overloads with the
unambiguous function used by the dashboard. Apply migrations 11 and 12 for
business profile settings and private feedback status, then apply
[`supabase/migrations/13_email_only_review_requests.sql`](./supabase/migrations/13_email_only_review_requests.sql)
to migrate customer contacts to email addresses, add email-delivery status,
remove phone/SMS/WhatsApp fields, and update request creation and delivery
credit accounting. Review requests now require a customer name and email.
Credits are reserved immediately before email dispatch; failed dispatches
refund the credit, and successful dispatches consume one credit. The first
migration creates `profiles`, `licenses`, and `settings`, enables row-level
security, and automatically creates profiles for new Supabase Auth users.
Apply
[`supabase/migrations/17_paddle_email_credit_purchases.sql`](./supabase/migrations/17_paddle_email_credit_purchases.sql)
to enable Paddle email-credit purchase fulfillment.
Apply
[`supabase/migrations/19_appsumo_byos_locations.sql`](./supabase/migrations/19_appsumo_byos_locations.sql)
after the previous migrations to add per-location settings, private feedback,
BYOS credential storage, system email credits, AppSumo location enforcement,
review-link click tracking, and scheduled follow-up state. Run the entire SQL
file in Supabase SQL Editor before deploying the matching application code.

## Paddle email credit checkout

Set `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` to the client-side token from Paddle and
`NEXT_PUBLIC_PADDLE_ENVIRONMENT` to `sandbox` or `production`. The environment
selects the matching credit-pack price IDs. Set `PADDLE_WEBHOOK_SECRET` to the
secret for a Paddle notification destination pointing to
`/api/webhook/paddle`, subscribed to `transaction.completed`. Keep the webhook
secret server-only. Configure the matching token, environment, and webhook
destination separately for each deployment environment. Apply
[`supabase/migrations/18_add_paddle_live_credit_prices.sql`](./supabase/migrations/18_add_paddle_live_credit_prices.sql)
before enabling the production catalog.

Credit pack checkouts create an authenticated, single-use purchase intent. The
Paddle Node SDK verifies each webhook signature, and the handler validates the
completed transaction and price before an atomic database function grants
credits; duplicate webhook deliveries do not grant the same purchase twice.

When a license code is provided at signup or redemption, it must already be
present in `licenses` with `status = 'available'` and a non-expired expiry
date. Keys are normalized to uppercase, then checked
against both HMAC-SHA-256 hashes (used for newly generated keys) and plain
SHA-256 hashes (for compatible existing imports); plaintext keys are never
stored. To create a disposable test key, run `npm run license:create-test`;
copy the one-time key printed by the command and use it in signup. Adding real
AppSumo keys still requires a trusted server-side import/integration. The
`licenses` table intentionally has no access policy for signed-in clients; only
the restricted redemption function and trusted server-side code can access
license records.
The Plan & credits form hashes the complete license key server-side and redeems
it through the authenticated RPC; `key_last4` is display metadata and is never
used to verify a key. Credit balances are initialized and upgraded with the
license entitlement. Credit grants do not reset monthly.

The dashboard creates one default business location per account; Tier 1 is
limited to one location, Tier 2 to five, and Tier 3 is unlimited. Switch the
active location from the dashboard header. Review requests are scoped to that
location. Email links and printable poster QR codes open the Smart Review
Gating page; low ratings are saved to `private_feedback` and higher ratings
continue to the saved Google review URL. BYOS Resend API keys and SMTP passwords are AES-256-GCM encrypted
before being stored in `email_provider_credentials`; that table has no
authenticated-client policies. Configure the encryption key before users
connect a provider.

The Vercel cron in `vercel.json` calls `/api/cron/review-followups` daily.
Vercel must have `CRON_SECRET` configured. Tier 2 can send one reminder after
three days; Tier 3 can send reminders on day 3 and day 7. A review page visit
marks the link as opened and suppresses future reminders. System delivery
uses the default Resend credentials and consumes the account's free/legacy
email credits; a connected sender is not charged TableSignal credits.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
