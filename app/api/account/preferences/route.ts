import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

export async function PATCH(request:Request){
  const account=await getCurrentAccount();
  if(!account) return NextResponse.json({error:"Sign in first."},{status:401});

  const body=await request.json() as {
    marketingEmails?:boolean;
    analytics?:boolean;
  };
  if(typeof body.marketingEmails!=="boolean" && typeof body.analytics!=="boolean"){
    return NextResponse.json({error:"No preference supplied."},{status:400});
  }

  const sql=getCatalogDb();
  await sql.query(
    `update public.customer_accounts
     set
       marketing_email_consent_at = case
         when $2::boolean is true then coalesce(marketing_email_consent_at,now())
         when $2::boolean is false then null
         else marketing_email_consent_at
       end,
       marketing_email_opted_out_at = case
         when $2::boolean is false then now()
         when $2::boolean is true then null
         else marketing_email_opted_out_at
       end,
       analytics_consent_at = case
         when $3::boolean is true then coalesce(analytics_consent_at,now())
         when $3::boolean is false then null
         else analytics_consent_at
       end,
       analytics_opted_out_at = case
         when $3::boolean is false then now()
         when $3::boolean is true then null
         else analytics_opted_out_at
       end,
       updated_at=now()
     where id=$1::uuid`,
    [
      account.id,
      typeof body.marketingEmails==="boolean" ? body.marketingEmails : null,
      typeof body.analytics==="boolean" ? body.analytics : null,
    ],
  );

  return NextResponse.json({ok:true});
}
