# gemini-vercel-starter-template

Minimal **Vite + React + TypeScript** starter that deploys cleanly on **Vercel** (no Next.js).

## Requirements

- Node.js 18+ (recommended)

## Scripts

- `npm run dev` — start dev server
- `npm run build` — typecheck + production build (outputs to `dist/`)
- `npm run preview` — preview production build locally

## Deploy to Vercel

- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

## Development

```bash
npm install
npm run dev
```

## Clerk

Create a `.env` file (do not commit it) based on `.env.example`:

```bash
# Clerk (Vite client)
VITE_CLERK_PUBLISHABLE_KEY=pk_******

# Clerk (server)
CLERK_SECRET_KEY=sk_******
```

## Stripe

Set the following in `.env` (do not commit it):

```bash
STRIPE_SECRET_KEY=sk_******
STRIPE_TEAM_PRICE_ID=price_******
STRIPE_BUSINESS_PRICE_ID=price_******
STRIPE_WEBHOOK_SECRET=whsec_******
```

Webhook endpoint (Netlify Function): `/.netlify/functions/stripe-webhook`

## Supabase

Server-side env vars (do not commit them):

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key
```

Schema SQL is tracked in [supabase/schema.sql](supabase/schema.sql).

## Resend (email)

Set the following in `.env` (do not commit it):

```bash
RESEND_API_KEY=re_******
EMAIL_FROM="Reasonly <noreply@yourdomain.com>"
```

## Admin analytics

`/api/admin/analytics` is protected by an admin key.

```bash
ADMIN_KEY=super-long-random-string
```

Call it with header `x-admin-key: $ADMIN_KEY`.

