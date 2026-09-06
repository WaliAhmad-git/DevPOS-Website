# Makkah Foods POS — trial & sales site

Implements the spec in `pos_trial_site_prompt.md`, **assuming Option A**
(one hosted, always-on demo backend, reset per attempt). This is what the
spec itself says to build against unless you pick Option B or C — do that
math before deploying, not after.

## ⚠️ You still need to stand up the demo backend yourself

This repo is the Vercel side only: marketing pages, signup/login, trial
attempt counting, plan selection, and license issuance. It does **not**
include hosting for the actual FastAPI POS app — Vercel can't run that
(serverless JS only, no persistent Python/SQLite process). Before "Try it
now" will do anything real:

1. Deploy the existing FastAPI POS app (from `MakkahFoodsPOS_UI_v9.zip`) to
   a small always-on host — Railway, Render, Fly.io, or a cheap VPS.
2. Add a `POST /api/demo/reset` endpoint to that app that:
   - accepts `{ session_token, pre_activated, demo_license_key, teardown }`,
   - wipes app data back to a clean seed state,
   - if `pre_activated` is true, marks the demo license as already
     activated (skip the key-entry screen); otherwise leaves it
     unactivated so the visitor sees the key screen and can type in
     `demo_license_key`.
3. Set `DEMO_BACKEND_URL` and `DEMO_BACKEND_RESET_TOKEN` in this site's env
   to point at it.

Until that's done, `/trial` will start a session and count against the
visitor's 5 attempts, but the iframe will show a "not configured" message
instead of a live demo.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real values
```

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor — this creates `accounts`,
   `trial_sessions`, `license_keys`, `purchases`, `plan_limits`, RLS
   policies, and a trigger that auto-creates an `accounts` row (with
   `trial_attempts_remaining` read from `plan_limits`, so the "5" lives in
   one place, not hardcoded across the app — change it there to change it
   everywhere) on signup.
3. Copy `LICENSE_SECRET_TOKENS` **verbatim** from
   `backend/licensing.py`'s `SECRET_TOKENS` list (pick 10, comma-separated,
   in `.env.local` — never commit these, and never import
   `lib/licensing-server.ts` from a client component or the tokens end up
   in browser-shipped JS).
4. `npm run dev`.

## What's deliberately NOT built (per spec §7)

- Real payment processing. `/api/purchase/select` creates a
  `pending_payment` purchase row; wire Stripe (or similar) separately and
  flip `purchases.status` / `accounts.purchase_status` to `"paid"` from
  that provider's webhook — not from the browser. `/api/license/issue`
  already refuses to issue a key until `status = "paid"`.
- Email verification/OTP — signup is email+password only, by design.
- The exact Basic vs Advanced feature list — `app/pricing/page.tsx` has a
  `FEATURE_DIFF` placeholder; fill it in once that product decision is
  made, and make the real `.exe` builds respect the same flags.

## Download page

`app/download/page.tsx` currently points at static files under
`public/downloads/<tier>/MakkahFoodsPOS-<tier>.zip`. Each zip must contain
`MakkahFoodsPOS.exe` and `MakkahFoodsPOS.bat` (the launcher in the spec,
§6) **in the same folder** — `%~dp0` in the `.bat` resolves relative to
itself, so shipping them as two separate download links would break it.
Build one zip per tier from `BUILD_WINDOWS.md` and drop it in
`public/downloads/basic/` / `public/downloads/advanced/`.

## License keys

`lib/licensing-server.ts` reimplements the exact Fibonacci-cipher scheme
from `backend/licensing.py` (same `SAFE_CHARS`, `FIBONACCI` offsets, date
and token positions) so keys issued here validate against the existing
desktop app's `verify_license()` unchanged — this site never duplicates
or replaces that logic, it only generates strings that scheme already
understands.

## Security hardening (added)

**Rate limiting** — `lib/rate-limit.ts` uses Upstash Redis (free tier) to
cap `trial/start`, `trial/end`, `purchase/select`, and `license/issue` per
IP. Sign up at upstash.com, create a Redis DB, and set
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in your env before
deploying — without them, rate limiting silently no-ops (fine for local
dev, not for production).

**Input validation** — `lib/validation.ts` uses zod to validate every API
route body before it touches the database. Malformed/malicious payloads
get a `400` instead of reaching Supabase.

**Security headers** — `next.config.mjs` sets CSP, X-Frame-Options,
HSTS, and friends on every response. Update the `frame-src` entry in the
CSP once your demo backend has a real domain (currently allows
`*.onrender.com` as a placeholder).

**SQL injection / XSS** — not separately "added" because the architecture
already prevents both: every DB call goes through the Supabase client
(parameterized automatically, never raw string-built SQL), and React
escapes all rendered output by default. Just never introduce
`dangerouslySetInnerHTML` or raw `.sql()` calls without sanitizing first.

**Cloudflare (do this yourself, no code needed)** — point your domain's
DNS through Cloudflare (free plan) for both the Vercel site and the Render
demo backend. Enable Bot Fight Mode and a WAF rate-limit rule on
`/api/trial/start`, `/signup`, `/login`. This catches dirb-style scanning
and DDoS traffic before it reaches either app — the Upstash rate limiting
above is the second layer, not the first.

**Supabase auth hardening** — in the dashboard, Authentication → Rate
Limits: enable Supabase's built-in limits on signup/login. Authentication
→ Providers → Email: confirm "Confirm email" stays OFF (per spec) but
consider adding hCaptcha if bot signups become a problem.

**FastAPI demo backend** — see `backend-patches/README.md` for what to
change in the existing `backend/main.py` before deploying to Render
(CORS scoping, hiding `/docs` in production, and the new
`/api/demo/reset` endpoint). Most of the hardening (CSP headers, login
rate limiting, license enforcement) already exists in that codebase —
don't rebuild it.
