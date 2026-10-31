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
  const [accessIssue, setAccessIssue] = useState<"signed-out" | "not-admin" | "">("");

  async function load() {
    setLoading(true); setError("");
    setAccessIssue("");
    try {
      const [meResponse, accountResponse] = await Promise.all([
        fetch("/api/admin/me", { cache: "no-store" }),
        fetch(`/api/admin/accounts?search=${encodeURIComponent(search)}`, { cache: "no-store" }),
      ]);
      if (meResponse.status === 401) { setAccessIssue("signed-out"); return; }
      if (meResponse.status === 403 || accountResponse.status === 403) { setAccessIssue("not-admin"); return; }
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

  const summary = accounts.reduce((totals, row) => ({
    rooms: totals.rooms + row.rooms,
    images: totals.images + row.renders,
    cost: totals.cost + Number(row.costUsdMicros || 0),
  }), { rooms: 0, images: 0, cost: 0 });

  return <main className="pageShell adminShell">
    <div className="pageTop"><Brand /><div className="adminTopActions"><Link href="/admin/catalog-review" className="textLink">Review products</Link><Link href="/account" className="textLink">My account</Link><span className="adminOwnerMark">Owner workspace</span></div></div>
    <section className="adminPage" id="roomfound-main">
      <div className="adminIntro"><div><p className="eyebrow">Transform My Room · Owner dashboard</p><h1>Your workspace</h1><p className="adminLead">A clear view of customer activity and image usage.</p></div>
        {allowed && <button type="button" className="button buttonSecondary buttonCompact" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh data"}</button>}
      </div>
      {loading && <div className="adminLoading" role="status"><span className="adminSpinner" />Loading your dashboard…</div>}
      {accessIssue === "signed-out" && <section className="adminAccessCard"><span className="adminAccessIcon" aria-hidden="true">↗</span><div><p className="eyebrow">Sign in required</p><h2>Sign in to open your dashboard</h2><p>Open your account, choose <strong>Sign in</strong>, and use the verified owner account. Then come back here.</p><Link href="/account" className="button buttonPrimary">Open account sign-in</Link></div></section>}
      {accessIssue === "not-admin" && <section className="adminAccessCard"><span className="adminAccessIcon" aria-hidden="true">i</span><div><p className="eyebrow">Owner access</p><h2>This account can’t open the dashboard</h2><p>Use your verified owner account. If you’re signed into a different account, open My account, sign out, then sign in with the owner account.</p><Link href="/account" className="button buttonSecondary">Open My account</Link></div></section>}
      {error && <p role="alert" className="adminNotice">{error}</p>}
      {allowed && !loading && <>
        <section className="adminOwnerCard"><div className="adminAvatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</div><div><p className="adminOwnerLabel">Signed in as</p><strong>{email}</strong></div><div className="adminOwnerNote"><span className="adminStatusDot" />Owner access <span>·</span> Image generation uses your provider’s own account allowance.</div></section>
        <div className="adminMetricGrid" aria-label="Overview of matching accounts">
          <article className="adminMetric"><span>Accounts in this view</span><strong>{accounts.length}</strong><small>Newest matching accounts</small></article>
          <article className="adminMetric"><span>Rooms saved</span><strong>{summary.rooms}</strong><small>Across this account list</small></article>
          <article className="adminMetric"><span>Images generated</span><strong>{summary.images}</strong><small>Across this account list</small></article>
          <article className="adminMetric"><span>Recorded image cost</span><strong>${(summary.cost / 1_000_000).toFixed(2)}</strong><small>Provider cost recorded so far</small></article>
        </div>
        <section className="adminCard adminAccountsCard"><div className="adminSectionHeading"><div><p className="eyebrow">Customer accounts</p><h2>Account activity</h2><p className="adminFine">Read-only account and usage totals. Private room photos and design prompts stay private.</p></div><span className="adminResultCount">{accounts.length} shown</span></div>
          <form onSubmit={searchAccounts} className="adminSearch"><label htmlFor="admin-search">Search customers</label><div><input id="admin-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email address or name" /><button className="button buttonSecondary buttonCompact" disabled={loading}>Search</button></div></form>
          {accounts.length > 0 ? <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Account</th><th>Account status</th><th>Joined</th><th>Last active</th><th>Credits</th><th>Rooms</th><th>Images</th><th>Image cost</th></tr></thead>
            <tbody>{accounts.map((row) => <tr key={row.id}><td><strong>{row.displayName || "Customer"}</strong><small>{row.email}</small></td><td><span className={`adminBadge ${row.verifiedAt ? "isVerified" : ""}`}>{row.verifiedAt ? "Verified" : "Unverified"}</span></td><td>{date(row.createdAt)}</td><td>{date(row.lastSeenAt || row.lastLoginAt)}</td><td>{row.siteCreditExempt ? "API allowance" : row.creditBalance}</td><td>{row.rooms}</td><td>{row.renders}</td><td>{row.costUsdMicros == null ? "—" : `$${(Number(row.costUsdMicros) / 1_000_000).toFixed(2)}`}</td></tr>)}</tbody>
          </table></div> : <div className="adminEmpty"><strong>No customer accounts found</strong><span>Try a different name or email address.</span></div>}
          <p className="adminFine adminTableNote">Showing the newest 50 matching accounts. Image costs are recorded in US dollars.</p>
        </section>
      </>}
    </section>
  </main>;
}
