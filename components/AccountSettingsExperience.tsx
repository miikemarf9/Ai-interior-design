'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AccountPrivacyControls } from "@/components/AccountPrivacyControls";
import styles from "./AccountSettings.module.css";

type SettingsPayload = {
  account: { email: string; displayName: string | null; verified: boolean };
  preferences: { marketingEmails: boolean };
};

export function AccountSettingsExperience() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as SettingsPayload;
      })
      .then((data) => { if (active) setPayload(data); })
      .catch(() => { if (active) setError("We couldn’t load your account settings. Please refresh the page."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/account");
  }

  return (
    <main className={`accountPage ${styles.settingsPage}`}>
      <header className="accountTopbar">
        <Brand />
        <div>
          <Link href="/account">My rooms</Link>
          <Link href="/design">New room</Link>
          {payload ? <button type="button" onClick={() => void signOut()}>Sign out</button> : null}
        </div>
      </header>

      <section className={`shellWide ${styles.settingsIntro}`}>
        <p className="eyebrow">Your account</p>
        <h1>Profile &amp; settings</h1>
        <p>Manage your profile and privacy choices.</p>
      </section>

      {loading ? <p className={`shellWide ${styles.settingsMessage}`} role="status">Loading your settings…</p> : null}
      {error ? <p className={`shellWide ${styles.settingsError}`} role="alert">{error}</p> : null}
      {!loading && !error && !payload ? (
        <section className={`shellWide ${styles.settingsCallout}`}>
          <h2>Sign in to view your settings</h2>
          <p>Your privacy preferences are available from your Transform My Room account.</p>
          <Link className="button buttonPrimary" href="/account">Go to sign in</Link>
        </section>
      ) : null}

      {payload ? (
        <>
          <section className={`shellWide ${styles.profileCard}`} aria-label="Profile details">
            <div>
              <span className="microLabel">Profile</span>
              <h2>{payload.account.displayName || "Your profile"}</h2>
            </div>
            <div className={styles.profileEmail}>
              <small>ACCOUNT EMAIL</small>
              <strong>{payload.account.email}</strong>
              <span className={payload.account.verified ? styles.verified : styles.unverified}>
                {payload.account.verified ? "Email verified" : "Email verification pending"}
              </span>
            </div>
          </section>
          <section className={`shellWide ${styles.settingsPrivacy}`}>
            <AccountPrivacyControls initialMarketingEmails={payload.preferences.marketingEmails} />
          </section>
        </>
      ) : null}
    </main>
  );
}
