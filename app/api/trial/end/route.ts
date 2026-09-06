import { NextResponse } from "next/server";
import { supabaseForRequest, supabaseService } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp, trialStartLimiter } from "@/lib/rate-limit";
import { parseBody, trialEndSchema } from "@/lib/validation";

// Called on: the POS's own Shutdown button, a beforeunload/visibilitychange
// beacon (best-effort — not 100% reliable, which is fine per spec §3), or
// server-side by a timeout sweep. Any of these tells the demo backend to
// reset and marks the session ended.
export async function POST(req: Request) {
  // Same bucket as trial/start — ending sessions is cheap but still worth
  // capping against abuse/misfires.
  const rateLimited = await checkRateLimit(trialStartLimiter, getClientIp(req));
  if (rateLimited) return rateLimited;

  const authed = supabaseForRequest();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // sendBeacon posts a Blob without a JSON content-type in some browsers,
  // so fall back to an empty object rather than rejecting the request —
  // this route's body is advisory (which reason/session), not required.
  const parsed = await parseBody(req, trialEndSchema).catch(() => null);
  const { reason, demoSessionToken } = parsed?.data ?? { reason: "tab_closed" as const, demoSessionToken: undefined };

  const db = supabaseService();

  let query = db
    .from("trial_sessions")
    .update({ ended_at: new Date().toISOString(), end_reason: reason })
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (demoSessionToken) {
    query = query.eq("demo_session_token", demoSessionToken);
  }

  await query;

  const demoBackendUrl = process.env.DEMO_BACKEND_URL;
  if (demoBackendUrl && demoSessionToken) {
    fetch(`${demoBackendUrl}/api/demo/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEMO_BACKEND_RESET_TOKEN}`,
      },
      body: JSON.stringify({ session_token: demoSessionToken, teardown: true }),
    }).catch(() => {
      /* best-effort, per spec */
    });
  }

  return NextResponse.json({ ok: true });
}
