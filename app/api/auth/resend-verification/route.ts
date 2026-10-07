import { NextResponse } from "next/server";
import { getCurrentAccount, issueAuthToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (account.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  const token = await issueAuthToken(account.id, "verify_email", 24);
  const sent = await sendVerificationEmail(account.email, token, new URL(request.url).origin);
  return NextResponse.json({ ok: true, emailSent: sent.sent });
}
