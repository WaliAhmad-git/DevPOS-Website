# Backend hardening — what to change before deploying to Render

Your `backend/main.py` already has more security built in than a typical
FastAPI app: CSP/security headers middleware, a login rate limiter, and
license-enforcement middleware. Don't rebuild any of that. Three things
actually need to change for the Render deployment:

## 1. CORS — restrict to your real domain

Currently:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    ...
)
```

Change to your real Vercel domain once you have it:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-site.vercel.app",   # replace with your real domain
        "http://localhost:3000",           # keep for local dev only
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Never use `allow_origins=["*"]` with `allow_credentials=True` — browsers
reject that combination anyway, but it's worth stating: don't try to work
around it by dropping credentials instead of scoping origins.

## 2. Turn off debug mode / hide docs in production

Add to your Render service's environment (not code):
```
UVICORN_RELOAD=false
```
And in whatever you use to launch uvicorn for Render (e.g. `Procfile` or
start command), make sure `--reload` is NOT passed, and set:
```python
app = FastAPI(
    title="POS System API",
    description="Point of Sale system for UK grocery shop",
    version="4.1.0",
    docs_url=None if is_production else "/docs",      # hide Swagger UI publicly
    redoc_url=None if is_production else "/redoc",
)
```
where `is_production = os.environ.get("ENVIRONMENT") == "production"`.
Auto-generated API docs are a free reconnaissance map for an attacker —
fine locally, not fine on a public demo host.

## 3. The general rate-limit: extend the existing pattern, don't replace it

Your `_login_rate_limit_check` is already the right shape — sliding
window, in-memory deque, keyed by IP. Reuse the exact same helper for the
new `/api/demo/reset` endpoint below (that's the one endpoint an attacker
could hammer to burn through your Render free-tier compute/DB resets).

If you later run multiple uvicorn workers (Render's paid tiers support
this), swap the in-memory deque for Redis-backed rate limiting — same
Upstash Redis instance you're already using for the Next.js site works
fine here too via the `redis` Python client.

## 4. New endpoint: `/api/demo/reset`

This is what the trial site's `trial/start` and `trial/end` routes call.
Add it to `backend/main.py` (or a new `backend/routes/demo.py` router if
you prefer, following the pattern of your other routers):

```python
import os
import secrets

from fastapi import Header

DEMO_RESET_TOKEN = os.environ.get("DEMO_BACKEND_RESET_TOKEN", "")

class DemoResetRequest(BaseModel):
    session_token: str
    pre_activated: bool = False
    demo_license_key: str | None = None
    teardown: bool = False

@app.post("/api/demo/reset")
async def demo_reset(
    body: DemoResetRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    # Constant-time comparison — same reasoning as your license token
    # matching in licensing.py: don't let a timing difference leak
    # whether a guessed token was "close".
    expected = f"Bearer {DEMO_RESET_TOKEN}"
    if not DEMO_RESET_TOKEN or not secrets.compare_digest(authorization or "", expected):
        raise HTTPException(status_code=401, detail="unauthorized")

    _login_rate_limit_check(f"demo-reset:{body.session_token[:8]}")
    _login_rate_limit_record(f"demo-reset:{body.session_token[:8]}")

    if body.teardown:
        # Session ended — wipe/release whatever per-session state you keep.
        # (reset_demo_data() below covers this too if teardown == a full wipe)
        reset_demo_data(db)
        return {"ok": True}

    # Wipe back to seed data — reuse whatever seeding logic already exists
    # for a fresh install/first run; do NOT touch real customer data tables
    # if this demo backend ever shares a DB with anything else (it shouldn't).
    reset_demo_data(db)

    if body.pre_activated:
        # Mark the demo license as already activated so attempts 2-5 skip
        # the key-entry screen (per spec §4).
        activate_demo_license(db, already_valid=True)
    else:
        # Leave unactivated — visitor sees the key screen and must type
        # body.demo_license_key (which the Next.js site also displayed to
        # them) to proceed, exercising the real activation flow.
        deactivate_demo_license(db)

    return {"ok": True, "session_token": body.session_token}
```

You'll need to write `reset_demo_data()`, `activate_demo_license()`, and
`deactivate_demo_license()` yourselves — they depend on your actual schema
and seed-data story, which I don't have enough of `backend/database.py` /
`backend/schema_init.py` to safely guess at. Point me at those two files
if you want this filled in exactly rather than sketched.

## 5. Set `DEMO_BACKEND_RESET_TOKEN` to something real

Generate one with:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
Set it as an env var on both Render (backend) and Vercel (`DEMO_BACKEND_RESET_TOKEN`
in your Next.js `.env.local`/Vercel project settings) — they must match exactly.
