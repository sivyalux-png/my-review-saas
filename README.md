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
6. Add all five variables in Vercel under **Project Settings → Environment
   Variables**, using the correct site URL for each environment, then restart
   the local development server or redeploy.

Only use the Supabase publishable key in these `NEXT_PUBLIC_` variables. Never
put a Supabase secret or service-role key in browser-visible configuration.
Email signup creates a Supabase Auth user, and the database trigger creates
their profile. If email confirmation is enabled, the confirmation callback
activates the license before redirecting to the dashboard.
With email confirmation enabled, open the confirmation link in the same
browser within 24 hours so the pending license can be activated.

## Supabase database schema

The initial database schema is in
[`supabase/migrations/01_initial_schema.sql`](./supabase/migrations/01_initial_schema.sql).
After applying that initial schema, also run
[`supabase/migrations/02_redeem_licenses.sql`](./supabase/migrations/02_redeem_licenses.sql)
in your project's **SQL Editor**. It adds the atomic, authenticated
`redeem_license` function. The first migration creates `profiles`, `licenses`,
and `settings`, enables row-level security, and automatically creates profiles
for new Supabase Auth users.

Signup accepts only a key already present in `licenses` with `status = 'available'`
and a non-expired expiry date. Keys are normalized to uppercase and stored as
server-generated HMAC-SHA-256 hashes, never plaintext. To create a disposable
test key, run `npm run license:create-test`; copy the one-time key printed by
the command and use it in signup. Adding real AppSumo keys still requires a
trusted server-side import/integration. The `licenses` table intentionally has
no access policy for signed-in clients; only the restricted redemption
function and trusted server-side code can access license records.

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
