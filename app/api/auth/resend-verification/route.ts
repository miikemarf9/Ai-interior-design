import { NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/lib/security/rate-limit";
import { getCurrentAccount, issueAuthToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (account.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  const rate = await checkAuthRateLimit({ request, action: "resend_verification", identity: account.email, limit: 3, blockMinutes: 30 });
  if (!rate.allowed) {
    return NextResponse.json({ error: rate.configured ? "Please wait before requesting another verification email." : "Account security is not configured." }, {
      status: rate.configured ? 429 : 503,
      headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : undefined,
    });
  }

  const token = await issueAuthToken(account.id, "verify_email", 24);
  const sent = await sendVerificationEmail(account.email, token, new URL(request.url).origin);
  return NextResponse.json({ ok: true, emailSent: sent.sent });
}
