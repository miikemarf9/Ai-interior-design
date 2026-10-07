import { NextResponse } from "next/server";
import { getCreditStatus } from "@/lib/render/credits-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ownerKey = new URL(request.url).searchParams.get("ownerKey") || "";

  if (!/^[a-zA-Z0-9_-]{20,100}$/.test(ownerKey)) {
    return NextResponse.json({ error: "Invalid owner key." }, { status: 400 });
  }

  try {
    const status = await getCreditStatus(ownerKey);
    return NextResponse.json({
      ...status,
      renderCreditCost: 1,
      briefCreditCost: 0,
    });
  } catch {
    return NextResponse.json({ error: "Credit status unavailable." }, { status: 500 });
  }
}
