import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { grantMonthlyFreeCredits } from "@/lib/auth/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CATALOG_IMPORT_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const creditedAccounts = await grantMonthlyFreeCredits();
    const month = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
    return NextResponse.json({ ok: true, month, creditedAccounts }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Monthly image credits could not be granted." }, { status: 500 });
  }
}
