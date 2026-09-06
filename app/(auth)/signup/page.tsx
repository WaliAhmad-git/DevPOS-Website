"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Email + password only, no OTP/email verification step — deliberate, per
// spec §1: this is a sales/trial site, not the production POS, so the cost
// of a bad email address here is low and the friction isn't worth it.
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    // The on_auth_user_created trigger (supabase/schema.sql) creates the
    // accounts row with trial_attempts_remaining set from plan_limits.
    router.push("/trial");
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "64px auto" }}>
      <h2>Create your account</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p style={{ color: "#e05252" }}>{error}</p>}
        <button className="btn" type="submit" style={{ width: "100%" }}>
          Sign up — 5 free trials
        </button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </div>
  );
}
