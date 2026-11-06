import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";

export const runtime = "nodejs";

type Provider = "google" | "facebook" | "x";
const providers = new Set<Provider>(["google", "facebook", "x"]);
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };

function callbackUrl(request: NextRequest, provider: Provider) {
  const base = process.env.APP_URL || request.nextUrl.origin;
  return new URL(`/api/auth/oauth/${provider}/callback`, base).toString();
}

function providerSettings(provider: Provider) {
  if (provider === "google") return { clientId: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
  if (provider === "facebook") return { clientId: process.env.FACEBOOK_APP_ID, secret: process.env.FACEBOOK_APP_SECRET };
  return { clientId: process.env.X_CLIENT_ID, secret: process.env.X_CLIENT_SECRET };
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await context.params;
  if (!providers.has(rawProvider as Provider)) return NextResponse.json({ error: "Unsupported sign-in provider." }, { status: 404 });
  const provider = rawProvider as Provider;
  const { clientId, secret } = providerSettings(provider);
  if (!clientId || !secret) {
    return NextResponse.redirect(new URL("/account?socialError=not-configured", request.nextUrl.origin));
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const mode = request.nextUrl.searchParams.get("mode") === "signup" ? "signup" : "login";
  const ownerKey = request.nextUrl.searchParams.get("ownerKey")?.slice(0, 160) || "";
  const redirectUri = callbackUrl(request, provider);
  let authorizationUrl: URL;

  if (provider === "google") {
    authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
  } else if (provider === "facebook") {
    authorizationUrl = new URL("https://www.facebook.com/v23.0/dialog/oauth");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "email,public_profile",
      state,
    }).toString();
  } else {
    authorizationUrl = new URL("https://x.com/i/oauth2/authorize");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "users.read",
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
  }

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(`tmr_oauth_${provider}`, Buffer.from(JSON.stringify({ state, verifier, nonce, mode, ownerKey })).toString("base64url"), cookieOptions);
  return response;
}
