'use client';

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AccountPrivacyControls } from "@/components/AccountPrivacyControls";

type AccountPayload = {
  account: {
    id: string;
    email: string;
    displayName: string | null;
    verified: boolean;
    ownerKey: string;
  };
  credits: {
    balance: number;
    verificationStatus: string;
  };
  primaryHomeId: string;
  preferences: {
    marketingEmails: boolean;
    analyticsAccountConsent: boolean;
  };
  rooms: Array<{
    id: string;
    homeId: string | null;
    roomName: string;
    roomType: string;
    status: string;
    updatedAt: string;
    originalUrl: string | null;
    currentDesignUrl: string | null;
    renderedAt: string | null;
    briefTitle: string | null;
    briefDirection: string | null;
    productCount: number;
    roomTotalMinor: number | null;
  }>;
};

function money(minor: number | null) {
  if (minor === null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function savedRuntime() {
  try {
    const raw = window.localStorage.getItem("roomfound-design-runtime-v1");
    return raw ? JSON.parse(raw) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function AccountExperience() {
  const [payload, setPayload] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAccount() {
    setLoading(true);
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (!response.ok) {
        setPayload(null);
        return;
      }
      const data = await response.json() as AccountPayload;
      setPayload(data);

      const runtime = savedRuntime();
      window.localStorage.setItem(
        "roomfound-design-runtime-v1",
        JSON.stringify({ ...runtime, ownerKey: data.account.ownerKey }),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");

    try {
      if (authMode === "forgot") {
        await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setNotice("If that email has a Roomfound account, a reset link has been sent.");
        return;
      }

      const runtime = savedRuntime();
      const body: Record<string, unknown> = {
        email,
        password: String(form.get("password") || ""),
        ownerKey: typeof runtime.ownerKey === "string" ? runtime.ownerKey : undefined,
      };
      if (authMode === "signup") {
        body.displayName = String(form.get("displayName") || "");
        body.inviteCode = String(form.get("inviteCode") || "");
      }

      const response = await fetch(authMode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as {
        error?: string;
        ownerKey?: string;
        emailSent?: boolean;
      };

      if (!response.ok) throw new Error(data.error || "Account request failed.");

      if (data.ownerKey) {
        window.localStorage.setItem(
          "roomfound-design-runtime-v1",
          JSON.stringify({ ...runtime, ownerKey: data.ownerKey }),
        );
      }

      if (authMode === "signup") {
        setNotice(
          data.emailSent
            ? "Account created. Check your email to verify it and unlock your 3 design credits."
            : "Account created. Email delivery is not configured yet, so verification is still pending.",
        );
      }

      await loadAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = await response.json() as { emailSent?: boolean };
    setNotice(data.emailSent ? "Verification email sent." : "Email delivery is not configured yet.");
    setBusy(false);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setPayload(null);
    setAuthMode("login");
  }

  async function openRoom(id: string) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/account/rooms/${id}`, { cache: "no-store" });
      const room = await response.json() as {
        error?: string;
        designId: string;
        ownerKey: string;
        roomName: string;
        originalAssetId: string | null;
        intake: unknown;
        brief: unknown;
        selection: unknown;
        resultUrl: string | null;
      };
      if (!response.ok) throw new Error(room.error || "Room could not be opened.");

      window.localStorage.setItem(
        "roomfound-design-runtime-v1",
        JSON.stringify({
          ownerKey: room.ownerKey,
          designId: room.designId,
          roomAssetId: room.originalAssetId,
          photoName: room.roomName,
        }),
      );

      if (room.intake) {
        window.localStorage.setItem("roomfound-intake-v1", JSON.stringify({ state: room.intake, step: 9 }));
      }
      if (room.brief) {
        window.localStorage.setItem(
          "roomfound-brief-v1",
          JSON.stringify({ brief: room.brief, source: "saved-account-room", approved: true, updatedAt: new Date().toISOString() }),
        );
      }
      if (room.selection) {
        window.localStorage.setItem(
          "roomfound-product-selection-v1",
          JSON.stringify({ selection: room.selection, approved: true, updatedAt: new Date().toISOString() }),
        );
      }

      if (room.resultUrl) window.location.assign(`/room?design=${room.designId}`);
      else if (room.selection) window.location.assign("/render");
      else if (room.brief) window.location.assign("/products");
      else if (room.intake) window.location.assign("/brief");
      else window.location.assign("/design");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Room could not be opened.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="accountPage">
        <div className="accountLoading shell">
          <p className="eyebrow">My rooms</p>
          <h1>Opening your Roomfound account.</h1>
          <div className="briefLoadingLine"><i /></div>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="accountPage">
        <header className="accountTopbar">
          <Link href="/" className="accountBrand">Roomfound</Link>
          <Link href="/design">Design a room</Link>
        </header>

        <section className="accountAuth shell">
          <div className="accountAuthIntro">
            <p className="eyebrow">Your rooms, kept together</p>
            <h1>Save the thinking. Save the room. Come back anytime.</h1>
            <p>
              Your original photo, brief, selected products, current design, room total and design credits all live in one account.
            </p>
          </div>

          <form className="accountAuthCard" onSubmit={submitAuth}>
            <div className="accountAuthTabs">
              <button type="button" className={authMode === "login" ? "isActive" : ""} onClick={() => setAuthMode("login")}>Sign in</button>
              <button type="button" className={authMode === "signup" ? "isActive" : ""} onClick={() => setAuthMode("signup")}>Create account</button>
            </div>

            {authMode === "forgot" ? (
              <>
                <span className="microLabel">Password reset</span>
                <h2>Send me a reset link.</h2>
                <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
              </>
            ) : (
              <>
                <span className="microLabel">{authMode === "signup" ? "Create your Roomfound account" : "Welcome back"}</span>
                <h2>{authMode === "signup" ? "Keep every room in one place." : "Open your saved rooms."}</h2>
                {authMode === "signup" ? (
                  <>
                    <label><span>Name</span><input name="displayName" autoComplete="name" placeholder="Optional" /></label>
                    {process.env.NEXT_PUBLIC_BETA_CONTROLLED_ACCESS === "true" ? (
                      <label>
                        <span>Beta access code</span>
                        <input name="inviteCode" autoComplete="off" required />
                      </label>
                    ) : null}
                  </>
                ) : null}
                <label><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
                <label><span>Password</span><input name="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={10} required /></label>
              </>
            )}

            {error ? <p className="accountFormError" role="alert">{error}</p> : null}
            {notice ? <p className="accountFormNotice" role="status">{notice}</p> : null}

            <button className="button buttonPrimary" type="submit" disabled={busy}>
              {busy ? "Working…" : authMode === "signup" ? "Create account" : authMode === "forgot" ? "Send reset link" : "Sign in"}
            </button>

            {authMode === "login" ? (
              <button className="accountTextButton" type="button" onClick={() => setAuthMode("forgot")}>Forgot password?</button>
            ) : null}
            {authMode === "forgot" ? (
              <button className="accountTextButton" type="button" onClick={() => setAuthMode("login")}>Back to sign in</button>
            ) : null}

            <p className="accountSecurityNote">Verify your email once to secure saved rooms and activate your free design credits.</p>
          </form>
        </section>
      </main>
    );
  }

  const firstName = payload.account.displayName?.split(" ")[0] || "there";

  return (
    <main className="accountPage accountDashboard">
      <header className="accountTopbar">
        <Link href="/" className="accountBrand">Roomfound</Link>
        <div>
          <Link href="/design">New room</Link>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="accountHero shellWide">
        <div>
          <p className="eyebrow">My rooms</p>
          <h1>Good to have you back, {firstName}.</h1>
          <p>Every room keeps its original photo, design decisions and shopping plan together.</p>
        </div>
        <aside className="accountCredits">
          <span>Design credits</span>
          <strong>{payload.credits.balance}</strong>
          <small>{payload.account.verified ? "Verified account" : "Verify your email to unlock 3 free credits"}</small>
        </aside>
      </section>

      {!payload.account.verified ? (
        <section className="verificationBanner shellWide">
          <div>
            <span className="microLabel">Email verification</span>
            <strong>Your rooms are saved. Rendering stays locked until your email is verified.</strong>
          </div>
          <button type="button" onClick={resendVerification} disabled={busy}>Resend verification</button>
        </section>
      ) : null}

      {notice ? <p className="accountDashboardNotice shellWide">{notice}</p> : null}
      {error ? <p className="accountDashboardError shellWide">{error}</p> : null}

      <section className="shellWide">
        <AccountPrivacyControls initialMarketingEmails={payload.preferences.marketingEmails} />
      </section>

      <section className="savedRooms shellWide">
        <div className="savedRoomsHeading">
          <div>
            <p className="eyebrow">Saved to My home</p>
            <h2>Your rooms</h2>
          </div>
          <Link className="button buttonPrimary" href="/design">Design another room</Link>
        </div>

        {payload.rooms.length ? (
          <div className="savedRoomGrid">
            {payload.rooms.map((room) => (
              <article className="savedRoomCard" key={room.id}>
                <button className="savedRoomVisual" type="button" onClick={() => openRoom(room.id)} disabled={busy}>
                  {room.currentDesignUrl ? (
                    <img src={room.currentDesignUrl} alt={room.roomName} />
                  ) : room.originalUrl ? (
                    <img src={room.originalUrl} alt={room.roomName} />
                  ) : (
                    <span>No room image yet</span>
                  )}
                  <i>{room.currentDesignUrl ? "Current design" : "Original room"}</i>
                </button>
                <div className="savedRoomBody">
                  <div className="savedRoomTitle">
                    <div>
                      <small>{room.roomType.replaceAll("_"," ")}</small>
                      <h3>{room.roomName}</h3>
                    </div>
                    <strong>{money(room.roomTotalMinor)}</strong>
                  </div>
                  <p>{room.briefTitle || room.briefDirection || "Your design brief will appear here as the room develops."}</p>
                  <div className="savedRoomMeta">
                    <span>{room.productCount} selected {room.productCount === 1 ? "product" : "products"}</span>
                    <span>Updated {new Date(room.updatedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</span>
                  </div>
                  <button className="savedRoomOpen" type="button" onClick={() => openRoom(room.id)} disabled={busy}>
                    {room.currentDesignUrl ? "Open designed room" : "Continue this room"} <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptySavedRooms">
            <span className="microLabel">Nothing to organise yet</span>
            <h3>Your first room will appear here automatically.</h3>
            <p>Start with one room. Multiple homes and projects can sit on this same account structure later.</p>
            <Link className="button buttonPrimary" href="/design">Design my first room</Link>
          </div>
        )}
      </section>

    </main>
  );
}
