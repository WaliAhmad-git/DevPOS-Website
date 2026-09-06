"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type StartResponse = {
  demoSessionToken: string;
  showKeyScreen: boolean;
  demoLicenseKey: string | null;
  demoUrl: string | null;
  sessionMaxMinutes: number;
  error?: string;
};

export default function TrialWidget() {
  const [state, setState] = useState<"idle" | "starting" | "running" | "blocked" | "error">("idle");
  const [session, setSession] = useState<StartResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endSession = useCallback(
    (reason: "shutdown_button" | "tab_closed" | "timeout") => {
      if (!session) return;
      const payload = JSON.stringify({ reason, demoSessionToken: session.demoSessionToken });
      // sendBeacon so this still fires on tab close (best-effort, per spec §3).
      navigator.sendBeacon?.("/api/trial/end", new Blob([payload], { type: "application/json" }));
      setState("idle");
      setSession(null);
    },
    [session]
  );

  useEffect(() => {
    if (state !== "running" || !session) return;
    const onUnload = () => endSession("tab_closed");
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") endSession("tab_closed");
    });
    window.addEventListener("beforeunload", onUnload);

    // Hard cap per spec §3 so a forgotten-open tab doesn't hold the demo
    // backend forever.
    timeoutRef.current = setTimeout(() => endSession("timeout"), session.sessionMaxMinutes * 60_000);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, session]);

  async function startTrial() {
    setState("starting");
    setErrorMsg(null);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?next=/#try-now";
      return;
    }
    const res = await fetch("/api/trial/start", { method: "POST" });
    const data: StartResponse = await res.json();
    if (!res.ok) {
      if (data.error === "no_attempts_remaining") {
        setState("blocked");
      } else {
        setErrorMsg(data.error ?? "Something went wrong starting the trial.");
        setState("error");
      }
      return;
    }
    setSession(data);
    setState("running");
  }

  if (state === "blocked") {
    return (
      <div className="card">
        <h3>You&apos;ve used all your free trials</h3>
        <p className="muted">Pick a plan below to keep using DevPOS.</p>
        <a className="btn" href="#pricing">See pricing</a>
      </div>
    );
  }

  if (state === "running" && session) {
    return (
      <div>
        {session.showKeyScreen && session.demoLicenseKey && (
          <div className="key-banner">
            <strong>Demo key:</strong> <code>{session.demoLicenseKey}</code>
            <p className="muted" style={{ marginBottom: 0, marginTop: 6 }}>
              Enter this on the activation screen to continue. In the full product, your real
              license key is emailed to you after purchase and can also be found in Settings.
            </p>
          </div>
        )}
        {session.demoUrl ? (
          <div className="demo-frame-wrap">
            <iframe
              src={session.demoUrl}
              title="DevPOS demo"
              style={{ width: "100%", height: "80vh", border: "none", display: "block" }}
            />
          </div>
        ) : (
          <p className="muted">
            Demo backend URL not configured (DEMO_BACKEND_URL). See README for Option A setup.
          </p>
        )}
        <button className="btn secondary" style={{ marginTop: 14 }} onClick={() => endSession("shutdown_button")}>
          End trial session
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
      <h3>Try DevPOS</h3>
      <p className="muted">
        Opens the real point-of-sale system in your browser. Each session is capped and counts
        against your 5 free attempts.
      </p>
      {errorMsg && <p style={{ color: "#ff6b6b" }}>{errorMsg}</p>}
      <button className="btn" onClick={startTrial} disabled={state === "starting"}>
        {state === "starting" ? "Starting…" : "Try it now — 5 free sessions"}
      </button>
    </div>
  );
}
