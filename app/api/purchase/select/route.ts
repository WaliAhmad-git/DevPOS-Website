import { NextResponse } from "next/server";
import { supabaseForRequest, supabaseService } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp, purchaseLimiter } from "@/lib/rate-limit";
import { parseBody, purchaseSelectSchema } from "@/lib/validation";

const PRICES_GBP: Record<"basic" | "advanced", number> = {
  basic: 150,
  advanced: 200,
};

// Creates a "pending_payment" purchase row and marks it as the account's
// selected tier. Real payment processing is explicitly out of scope for
// this build pass (spec §7) — wire a provider (Stripe is the obvious pick)
// into this route later, and flip the purchase (and account) to "paid" from
// that provider's webhook, not from client-side confirmation.
export async function POST(req: Request) {
  const rateLimited = await checkRateLimit(purchaseLimiter, getClientIp(req));
  if (rateLimited) return rateLimited;

  const authed = supabaseForRequest();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const parsed = await parseBody(req, purchaseSelectSchema);
  if (parsed.errorResponse) return parsed.errorResponse;
  const { tier } = parsed.data;

  const db = supabaseService();

  const { data: purchase, error } = await db
    .from("purchases")
    .insert({ user_id: user.id, tier, amount_gbp: PRICES_GBP[tier], status: "pending_payment" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  await db.from("accounts").update({ selected_tier: tier, purchase_status: "pending_payment" }).eq(
    "user_id",
    user.id
  );

  return NextResponse.json({ purchase });
}
