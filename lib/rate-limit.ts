import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Free tier: sign up at upstash.com, create a Redis database, copy the
// REST URL + token into .env.local as UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN. If those aren't set, rate limiting is
// disabled (dev-friendly) rather than crashing the app — but never ship
// to production without them set.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Separate limiters per endpoint class, since they have very different
// legitimate usage patterns.
export const trialStartLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"), // 5 trial starts / 10 min / IP
      prefix: "rl:trial-start",
    })
  : null;

export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(8, "10 m"), // 8 signup/login attempts / 10 min / IP
      prefix: "rl:auth",
    })
  : null;

export const purchaseLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "rl:purchase",
    })
  : null;

/**
 * Returns null if the request is allowed, or a Response to return
 * immediately if it's been rate-limited. Pass the best available client
 * identifier (IP) as `key`.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<Response | null> {
  if (!limiter) return null; // not configured — allow (dev mode)
  const { success, limit, remaining, reset } = await limiter.limit(key);
  if (!success) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
      },
    });
  }
  return null;
}

/** Best-effort client IP extraction behind Vercel/Cloudflare proxies. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}
