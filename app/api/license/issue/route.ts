import { NextResponse } from "next/server";
import { supabaseForRequest, supabaseService } from "@/lib/supabase-server";
import { generateLicenseKey } from "@/lib/licensing-server";
import { checkRateLimit, getClientIp, purchaseLimiter } from "@/lib/rate-limit";
import { parseBody, licenseIssueSchema } from "@/lib/validation";

// Issues one real, unique-per-purchase license key. Only callable once a
// purchase's status is "paid" (in production, flip that from the payment
// provider's webhook — see app/api/purchase/select/route.ts — and call this
// route server-to-server from that webhook, not from the browser).
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

  const parsed = await parseBody(req, licenseIssueSchema);
  if (parsed.errorResponse) return parsed.errorResponse;
  const { purchaseId } = parsed.data;

  const db = supabaseService();

  const { data: purchase, error } = await db
    .from("purchases")
    .select("*")
    .eq("id", purchaseId)
    .eq("user_id", user.id)
    .single();

  if (error || !purchase) {
    return NextResponse.json({ error: "purchase_not_found" }, { status: 404 });
  }
  if (purchase.status !== "paid") {
    return NextResponse.json({ error: "purchase_not_paid" }, { status: 403 });
  }

  const { keyString, activationDate, expiryDate } = generateLicenseKey(new Date());

  const { data: license, error: licenseErr } = await db
    .from("license_keys")
    .insert({
      user_id: user.id,
      key_string: keyString,
      tier: purchase.tier,
      activation_date: activationDate,
      expiry_date: expiryDate,
      purchase_id: purchase.id,
    })
    .select()
    .single();

  if (licenseErr) {
    return NextResponse.json({ error: "license_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ license });
}
