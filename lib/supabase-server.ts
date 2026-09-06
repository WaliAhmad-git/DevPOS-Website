import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Service-role client: full DB access, bypasses RLS. NEVER import this
// into a client component — it must only run inside API routes / server
// components. This is how attempt-counting and key issuance stay
// server-authoritative (client can read its own rows via RLS, but cannot
// write trial_attempts_remaining, license_keys, etc. directly).
export function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Cookie-aware client for reading the logged-in user inside a route handler
// or server component, respecting RLS as that user.
export function supabaseForRequest() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
