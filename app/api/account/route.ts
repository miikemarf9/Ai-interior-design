import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { accountCreditBalance, ensurePrimaryHome } from "@/lib/auth/account";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime = "nodejs";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const sql = getCatalogDb();
  const [credits, homeId, rooms, preferences] = await Promise.all([
    accountCreditBalance(account.id),
    ensurePrimaryHome(account.id),
    sql.query(
      `select
        d.id::text as id,
        d.home_id::text as home_id,
        d.room_name,
        d.room_type,
        d.status,
        d.updated_at::text,
        d.original_room_asset_id::text as original_asset_id,
        d.brief,
        d.product_selection,
        latest.result_asset_id::text as result_asset_id,
        latest.completed_at::text as rendered_at
      from public.room_designs d
      left join lateral (
        select result_asset_id,completed_at
        from public.render_generations
        where design_id=d.id
          and status='succeeded'
          and result_asset_id is not null
        order by completed_at desc nulls last,created_at desc
        limit 1
      ) latest on true
      where d.account_id=$1::uuid
      order by d.updated_at desc`,
      [account.id],
    ),
    sql.query(
      `select
        marketing_email_consent_at::text,
        marketing_email_opted_out_at::text,
        analytics_consent_at::text,
        analytics_opted_out_at::text
       from public.customer_accounts
       where id=$1::uuid
       limit 1`,
      [account.id],
    ),
  ]);

  const mapped = (rooms as Array<any>).map((room) => ({
    id: room.id,
    homeId: room.home_id,
    roomName: room.room_name,
    roomType: room.room_type,
    status: room.status,
    updatedAt: room.updated_at,
    originalUrl: room.original_asset_id ? `/api/assets/${room.original_asset_id}` : null,
    currentDesignUrl: room.result_asset_id ? `/api/assets/${room.result_asset_id}` : null,
    renderedAt: room.rendered_at,
    briefTitle: room.brief?.title ?? null,
    briefDirection: room.brief?.direction ?? null,
    productCount: Array.isArray(room.product_selection?.products)
      ? room.product_selection.products.length
      : 0,
    roomTotalMinor: typeof room.product_selection?.totalMinor === "number"
      ? room.product_selection.totalMinor
      : null,
  }));

  return NextResponse.json({
    account: {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      verified: Boolean(account.emailVerifiedAt),
      ownerKey: account.ownerKey,
    },
    credits,
    primaryHomeId: homeId,
    preferences: {
      marketingEmails: Boolean((preferences as Array<any>)[0]?.marketing_email_consent_at)
        && !(preferences as Array<any>)[0]?.marketing_email_opted_out_at,
      analyticsAccountConsent: Boolean((preferences as Array<any>)[0]?.analytics_consent_at)
        && !(preferences as Array<any>)[0]?.analytics_opted_out_at,
    },
    rooms: mapped,
  });
}
