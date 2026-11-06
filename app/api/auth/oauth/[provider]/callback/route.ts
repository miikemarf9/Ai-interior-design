import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { applySessionCookie, createSession, hashPassword, issueAuthToken, normalizeEmail } from "@/lib/auth";
import { claimAnonymousRooms, enqueueCrmEvent, ensureAccountWallet, ensurePrimaryHome } from "@/lib/auth/account";
import { sendVerificationEmail } from "@/lib/auth/email";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";
type Provider = "google" | "facebook" | "x";
const supported = new Set<Provider>(["google", "facebook", "x"]);
type OAuthState = { state: string; verifier: string; nonce: string; mode: "login" | "signup"; ownerKey: string };
type Profile = { subject: string; email?: string; emailVerified?: boolean; name?: string };
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

function credentials(provider: Provider) {
  if (provider === "google") return { clientId: process.env.GOOGLE_CLIENT_ID || "", secret: process.env.GOOGLE_CLIENT_SECRET || "" };
  if (provider === "facebook") return { clientId: process.env.FACEBOOK_APP_ID || "", secret: process.env.FACEBOOK_APP_SECRET || "" };
  return { clientId: process.env.X_CLIENT_ID || "", secret: process.env.X_CLIENT_SECRET || "" };
}

function redirectUri(request: NextRequest, provider: Provider) {
  return new URL(`/api/auth/oauth/${provider}/callback`, process.env.APP_URL || request.nextUrl.origin).toString();
}

async function exchangeCode(request: NextRequest, provider: Provider, code: string, state: OAuthState): Promise<Profile> {
  const { clientId, secret } = credentials(provider);
  if (!clientId || !secret) throw new Error("provider_not_configured");
  const redirect = redirectUri(request, provider);
  let tokenResponse: Response;
  if (provider === "google") {
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: secret, redirect_uri: redirect, code_verifier: state.verifier }),
    });
    if (!tokenResponse.ok) throw new Error("provider_token_failed");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error("provider_token_failed");
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!response.ok) throw new Error("provider_profile_failed");
    const user = await response.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!user.sub || !user.email || user.email_verified !== true) throw new Error("provider_email_unverified");
    return { subject: user.sub, email: user.email, emailVerified: true, name: user.name };
  }

  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect });
  const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded" });
  if (provider === "facebook") {
    body.set("client_id", clientId); body.set("client_secret", secret);
    tokenResponse = await fetch("https://graph.facebook.com/v23.0/oauth/access_token", { method: "POST", headers, body });
    if (!tokenResponse.ok) throw new Error("provider_token_failed");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error("provider_token_failed");
    const profileUrl = new URL("https://graph.facebook.com/me");
    profileUrl.search = new URLSearchParams({ fields: "id,name,email", access_token: token.access_token }).toString();
    const response = await fetch(profileUrl);
    if (!response.ok) throw new Error("provider_profile_failed");
    const user = await response.json() as { id?: string; name?: string; email?: string };
    if (!user.id) throw new Error("provider_profile_failed");
    return { subject: user.id, email: user.email, name: user.name };
  }

  body.set("client_id", clientId); body.set("code_verifier", state.verifier);
  headers.set("Authorization", `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`);
  tokenResponse = await fetch("https://api.x.com/2/oauth2/token", { method: "POST", headers, body });
  if (!tokenResponse.ok) throw new Error("provider_token_failed");
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error("provider_token_failed");
  const response = await fetch("https://api.x.com/2/users/me?user.fields=name", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!response.ok) throw new Error("provider_profile_failed");
  const result = await response.json() as { data?: { id?: string; name?: string } };
  if (!result.data?.id) throw new Error("provider_profile_failed");
  return { subject: result.data.id, name: result.data.name };
}

async function signInExisting(request: NextRequest, accountId: string) {
  const sql = getCatalogDb();
  await sql.query(`update public.customer_accounts set last_login_at=now(),updated_at=now() where id=$1::uuid`, [accountId]);
  await sql.query(`update public.customer_auth_identities set last_login_at=now() where account_id=$1::uuid`, [accountId]);
  const session = await createSession(accountId);
  const response = NextResponse.redirect(new URL("/account?social=connected", request.nextUrl.origin));
  applySessionCookie(response, session.token, session.expiresAt);
  return response;
}

async function createSocialAccount(request: NextRequest, provider: Provider, profile: Profile, mode: OAuthState["mode"], ownerKey: string) {
  const email = normalizeEmail(profile.email || "");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("provider_email_missing");
  if (mode === "login") throw new Error("social_account_not_found");
  const rate = await checkAuthRateLimit({ request, action: "signup", identity: email, limit: 5 });
  if (!rate.allowed) throw new Error("signup_rate_limited");
  const sql = getCatalogDb();
  const existing = await sql.query(`select id::text as id,email_verified_at from public.customer_accounts where lower(email)=lower($1) limit 1`, [email]) as Array<{ id: string; email_verified_at: string | null }>;
  if (existing.length) {
    if (provider === "google" && profile.emailVerified && existing[0].email_verified_at) {
      const linked = await sql.query(
        `insert into public.customer_auth_identities (account_id,provider,provider_subject,email_at_link)
         values ($1::uuid,$2,$3,$4) on conflict (provider,provider_subject) do nothing returning account_id::text as account_id`,
        [existing[0].id, provider, profile.subject, email],
      ) as Array<{ account_id: string }>;
      const owner = linked[0]?.account_id || (await sql.query(
        `select account_id::text as account_id from public.customer_auth_identities where provider=$1 and provider_subject=$2 limit 1`,
        [provider, profile.subject],
      ) as Array<{ account_id: string }>)[0]?.account_id;
      if (owner !== existing[0].id) throw new Error("social_account_not_found");
      return signInExisting(request, existing[0].id);
    }
    throw new Error("email_already_used");
  }

  const displayName = (profile.name || "").trim().slice(0, 80);
  if (!displayName) throw new Error("provider_name_missing");
  const created = await sql.query(
    `insert into public.customer_accounts (email,password_hash,display_name)
     values ($1,$2,$3) returning id::text as id,email,display_name`,
    [email, hashPassword(randomBytes(48).toString("base64url")), displayName],
  ) as Array<{ id: string; email: string; display_name: string }>;
  const account = created[0];
  await sql.query(
    `insert into public.customer_auth_identities (account_id,provider,provider_subject,email_at_link)
     values ($1::uuid,$2,$3,$4)`,
    [account.id, provider, profile.subject, email],
  );
  const homeId = await ensurePrimaryHome(account.id);
  await ensureAccountWallet(account.id, false);
  await sql.query(`insert into public.crm_contact_links (account_id,provider) values ($1::uuid,'grabandbook') on conflict (account_id,provider) do nothing`, [account.id]);
  await enqueueCrmEvent(account.id, "account_created", "customer", account.id, { email, displayName, primaryHomeId: homeId, authProvider: provider });
  await claimAnonymousRooms(account.id, ownerKey || null);
  const token = await issueAuthToken(account.id, "verify_email", 24);
  const emailResult = await sendVerificationEmail(email, token, request.nextUrl.origin);
  const session = await createSession(account.id);
  const response = NextResponse.redirect(new URL(`/account?social=created${emailResult.sent ? "" : "&emailPending=1"}`, request.nextUrl.origin));
  applySessionCookie(response, session.token, session.expiresAt);
  return response;
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await context.params;
  if (!supported.has(rawProvider as Provider)) return NextResponse.json({ error: "Unsupported provider." }, { status: 404 });
  const provider = rawProvider as Provider;
  const response = NextResponse.redirect(new URL("/account?socialError=failed", request.nextUrl.origin));
  const cookieName = `tmr_oauth_${provider}`;
  const rawState = request.cookies.get(cookieName)?.value;
  response.cookies.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
  try {
    const encoded = new URL(request.url).searchParams.get("state") || "";
    const code = new URL(request.url).searchParams.get("code") || "";
    const cookie = rawState ? JSON.parse(Buffer.from(rawState, "base64url").toString("utf8")) as OAuthState : null;
    if (!cookie || !encoded || encoded !== cookie.state || !code) throw new Error("oauth_state_invalid");
    const profile = await exchangeCode(request, provider, code, cookie);
    const sql = getCatalogDb();
    const linked = await sql.query(
      `select account_id::text as account_id from public.customer_auth_identities where provider=$1 and provider_subject=$2 limit 1`,
      [provider, profile.subject],
    ) as Array<{ account_id: string }>;
    if (linked.length) return signInExisting(request, linked[0].account_id);
    if (!profile.email) {
      if (cookie.mode !== "signup") throw new Error("social_account_not_found");
      const pending = Buffer.from(JSON.stringify({ provider, subject: profile.subject, name: profile.name || "", ownerKey: cookie.ownerKey })).toString("base64url");
      const finish = NextResponse.redirect(new URL("/account?oauth=complete&auth=signup", request.nextUrl.origin));
      finish.cookies.set("tmr_oauth_pending", pending, { ...cookieOptions, maxAge: 600 });
      return finish;
    }
    return await createSocialAccount(request, provider, profile, cookie.mode, cookie.ownerKey);
  } catch (error) {
    console.error("Social sign-in failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.redirect(new URL("/account?socialError=failed", request.nextUrl.origin));
  }
}
