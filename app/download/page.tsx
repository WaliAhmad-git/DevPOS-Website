import { redirect } from "next/navigation";
import { supabaseForRequest, supabaseService } from "@/lib/supabase-server";

export default async function DownloadPage() {
  const authed = supabaseForRequest();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) redirect("/login");

  const db = supabaseService();
  const { data: account } = await db
    .from("accounts")
    .select("selected_tier, purchase_status")
    .eq("user_id", user!.id)
    .single();

  if (!account?.selected_tier) redirect("/pricing");

  const paid = account.purchase_status === "paid";

  return (
    <div className="card" style={{ margin: "64px auto", maxWidth: 640 }}>
      <h1>Download — {account.selected_tier === "advanced" ? "Advanced" : "Basic"}</h1>
      {!paid ? (
        <p className="muted">
          Your plan is selected but payment hasn&apos;t been confirmed yet. Once payment
          processing is wired up (spec §7), this unlocks automatically.
        </p>
      ) : (
        <div>
          <p>
            Download the installer package below. It contains{" "}
            <code>MakkahFoodsPOS.exe</code> and its <code>.bat</code> launcher — keep both files
            in the same folder; the launcher resolves the <code>.exe</code> relative to its own
            location.
          </p>
          <a
            className="btn"
            href={`/downloads/${account.selected_tier}/MakkahFoodsPOS-${account.selected_tier}.zip`}
          >
            Download {account.selected_tier} package (.zip)
          </a>
          <p className="muted" style={{ marginTop: 16 }}>
            Your license key is on your <a href="/account">account page</a>. Enter it on first
            launch to activate.
          </p>
        </div>
      )}
    </div>
  );
}
