import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseForRequest, supabaseService } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp, trialStartLimiter } from "@/lib/rate-limit";

// Per spec §3: an attempt is consumed at the START of a session, not the
// end — simplest to implement correctly, avoids counting bugs from
// visitors who never trigger an "end" event.
export async function POST(req: Request) {
  const rateLimited = await checkRateLimit(trialStartLimiter, getClientIp(req));
  if (rateLimited) return rateLimited;

  const authed = supabaseForRequest();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const db = supabaseService();

  const { data: account, error: accountErr } = await db
    .from("accounts")
    .select("trial_attempts_remaining, has_seen_key_screen")
    .eq("user_id", user.id)
    .single();

  if (accountErr || !account) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }
  if (account.trial_attempts_remaining <= 0) {
    return NextResponse.json({ error: "no_attempts_remaining" }, { status: 403 });
  }

  const showKeyScreen = !account.has_seen_key_screen; // only on first-ever attempt
  const demoSessionToken = randomUUID();

  // Ask the demo backend (Option A: a separate always-on host, NOT Vercel)
  // to reset app data for this attempt. License activation state is only
  // reset by the demo backend on the FIRST attempt — for attempts 2-5 we
  // tell it to provision already-activated, per spec §4.
  const demoBackendUrl = process.env.DEMO_BACKEND_URL;
  if (demoBackendUrl) {
    try {
      await fetch(`${demoBackendUrl}/api/demo/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEMO_BACKEND_RESET_TOKEN}`,
        },
        body: JSON.stringify({
          session_token: demoSessionToken,
          pre_activated: !showKeyScreen,
          demo_license_key: showKeyScreen ? process.env.DEMO_LICENSE_KEY : undefined,
        }),
      });
    } catch {
      return NextResponse.json({ error: "demo_backend_unreachable" }, { status: 502 });
    }
  }

  // Consume the attempt and record the session.
  const { error: decErr } = await db.rpc("decrement_trial_attempt", { p_user_id: user.id });
  if (decErr) {
    // Fallback path if the RPC hasn't been created — do it as two calls.
    // (Prefer creating a `decrement_trial_attempt` SQL function for atomicity
    // in production; see supabase/schema.sql.)
    await db
      .from("accounts")
      .update({ trial_attempts_remaining: account.trial_attempts_remaining - 1 })
      .eq("user_id", user.id);
  }

  if (showKeyScreen) {
    await db.from("accounts").update({ has_seen_key_screen: true }).eq("user_id", user.id);
  }

  await db.from("trial_sessions").insert({
    user_id: user.id,
    demo_session_token: demoSessionToken,
    showed_key_screen: showKeyScreen,
  });

  return NextResponse.json({
    demoSessionToken,
    showKeyScreen,
    demoLicenseKey: showKeyScreen ? process.env.DEMO_LICENSE_KEY : null,
    demoUrl: demoBackendUrl ? `${demoBackendUrl}/?session=${demoSessionToken}` : null,
    sessionMaxMinutes: Number(process.env.TRIAL_SESSION_MAX_MINUTES ?? 30),
  });
}
