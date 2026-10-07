import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { accountCreditBalance } from "@/lib/auth/account";

export const runtime = "nodejs";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ account: null }, { status: 401 });

  const credits = await accountCreditBalance(account.id);
  return NextResponse.json({
    account: {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      verified: Boolean(account.emailVerifiedAt),
      ownerKey: account.ownerKey,
    },
    credits,
  });
}
