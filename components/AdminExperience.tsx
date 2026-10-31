'use client';

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Brand } from "@/components/Brand";

type AccountRow = {
  id: string; email: string; displayName: string | null; status: string;
  verifiedAt: string | null; createdAt: string; lastLoginAt: string | null; lastSeenAt: string | null;
  creditBalance: number; siteCreditExempt: boolean; rooms: number; renders: number; costUsdMicros: number;
};

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export function AdminExperience() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [meResponse, accountResponse] = await Promise.all([
        fetch("/api/admin/me", { cache: "no-store" }),
        fetch(`/api/admin/accounts?search=${encodeURIComponent(search)}`, { cache: "no-store" }),
      ]);
      if (meResponse.status === 401) { setError("Sign in to your Transform My Room account to continue."); return; }
      if (meResponse.status === 403 || accountResponse.status === 403) { setError("This account is not on the admin access list yet. An admin must add its email to the ADMIN_EMAILS setting."); return; }
      const me = await meResponse.json();
      if (!meResponse.ok) throw new Error(me.error || "Could not load admin settings.");
      const list = await accountResponse.json();
      if (!accountResponse.ok) throw new Error(list.error || "Could not load accounts.");
      setAllowed(true); setEmail(me.account.email); setAccounts(list.accounts);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function searchAccounts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); await load();
  }

  return <main className="pageShell"><div className="pageTop"><Brand /><Link href="/account" className="textLink">My account</Link></div>
    <section className="adminPage"><p className="eyebrow">Transform My Room · Admin</p><h1>Admin area</h1>
      {loading && <p>Loading your admin area…</p>}
      {error && <p role="alert" className="adminNotice">{error}</p>}
      {allowed && <>
        <section className="adminCard"><p className="eyebrow">Your account</p><h2>{email}</h2>
          <p>Your own image generation follows the usage limit on your connected image API account.</p>
          <p className="adminFine">Your account is exempt from the customer credit counter. The image provider’s configured usage limit and billing still apply.</p>
        </section>
        <section className="adminCard"><p className="eyebrow">Customer accounts</p><h2>Account overview</h2>
          <p className="adminFine">Read-only account and usage totals. Private room photos and design prompts are not shown here.</p>
          <form onSubmit={searchAccounts} className="adminSearch"><label htmlFor="admin-search">Find by email or name</label><div><input id="admin-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type an email or name" /><button className="button buttonSecondary buttonCompact">Search</button></div></form>
          <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Account</th><th>State</th><th>Joined</th><th>Last active</th><th>Credits</th><th>Rooms</th><th>Images</th><th>Image cost</th></tr></thead>
            <tbody>{accounts.map((row) => <tr key={row.id}><td><strong>{row.displayName || "Customer"}</strong><small>{row.email}</small></td><td>{row.status}{row.verifiedAt ? " · verified" : " · unverified"}</td><td>{date(row.createdAt)}</td><td>{date(row.lastSeenAt || row.lastLoginAt)}</td><td>{row.siteCreditExempt ? "API allowance" : row.creditBalance}</td><td>{row.rooms}</td><td>{row.renders}</td><td>{row.costUsdMicros == null ? "—" : `$${(Number(row.costUsdMicros) / 1_000_000).toFixed(2)}`}</td></tr>)}</tbody>
          </table></div><p className="adminFine">Showing the newest 50 matching accounts. Image cost is the recorded provider cost in USD.</p>
        </section>
      </>}
    </section>
  </main>;
}
