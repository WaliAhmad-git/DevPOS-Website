import { redirect } from "next/navigation";
import { supabaseForRequest, supabaseService } from "@/lib/supabase-server";

export default async function AccountPage() {
  const authed = supabaseForRequest();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) redirect("/login");

  const db = supabaseService();
  const [{ data: account }, { data: keys }] = await Promise.all([
    db.from("accounts").select("*").eq("user_id", user!.id).single(),
    db.from("license_keys").select("*").eq("user_id", user!.id).order("issued_at", { ascending: false }),
  ]);

  return (
    <div style={{ margin: "64px auto", maxWidth: 760 }}>
      <h1>Your account</h1>
      <div className="card">
        <p>Email: {account?.email}</p>
        <p>Free trials remaining: {account?.trial_attempts_remaining} / 5</p>
        <p>Selected plan: {account?.selected_tier ?? "None yet"}</p>
        <p>Purchase status: {account?.purchase_status}</p>
      </div>

      <h2 style={{ marginTop: 32 }}>License keys</h2>
      {keys && keys.length > 0 ? (
        <table className="pricing-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Tier</th>
              <th>Activated</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td><code>{k.key_string}</code></td>
                <td>{k.tier}</td>
                <td>{k.activation_date}</td>
                <td>{k.expiry_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">No license keys issued yet — purchase a plan to get one.</p>
      )}
    </div>
  );
}
