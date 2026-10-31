import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { isAdminAccount } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isAdminAccount(account)) return NextResponse.json({ error: "Admin access is not enabled for this account." }, { status: 403 });
  return NextResponse.json({ account: { email: account.email }, siteCreditExempt: true });
}
