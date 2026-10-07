import { ImageResponse } from "next/og";
import { getCurrentAccount } from "@/lib/auth";
import { getCatalogDb } from "@/lib/catalog/neon";

export const runtime="nodejs";

const formats={
  pinterest:{width:1000,height:1500,label:"Pinterest",layout:"vertical"},
  instagram:{width:1080,height:1350,label:"Instagram",layout:"vertical"},
  story:{width:1080,height:1920,label:"Story / Reel",layout:"vertical"},
  facebook:{width:1200,height:630,label:"Facebook",layout:"horizontal"},
} as const;

function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function money(minor:number|null){
  if(minor===null) return "Shop this room";
  return `Shop this room · £${Math.round(minor/100).toLocaleString("en-GB")}`;
}

export async function GET(
  request:Request,
  context:{params:Promise<{designId:string;format:string}>},
){
  const {designId,format}=await context.params;
  const config=formats[format as keyof typeof formats];
  if(!config || !validUuid(designId)) return new Response("Not found",{status:404});

  const account=await getCurrentAccount();
  const ownerKey=new URL(request.url).searchParams.get("ownerKey") || "";
  const sql=getCatalogDb();

  const rows=await sql.query(
    `select
      d.room_name,d.product_selection,
      original.mime_type as original_mime,
      original.external_url as original_external,
      case when original.data is null then null else encode(original.data,'base64') end as original_base64,
      result.mime_type as result_mime,
      result.external_url as result_external,
      case when result.data is null then null else encode(result.data,'base64') end as result_base64
     from public.room_designs d
     join lateral (
       select result_asset_id
       from public.render_generations
       where design_id=d.id and status='succeeded' and result_asset_id is not null
       order by completed_at desc nulls last,created_at desc
       limit 1
     ) g on true
     join public.design_assets result on result.id=g.result_asset_id
     left join public.design_assets original on original.id=d.original_room_asset_id
     where d.id=$1::uuid
       and (
         ($2::uuid is not null and d.account_id=$2::uuid)
         or ($3 <> '' and d.owner_key=$3)
       )
     limit 1`,
    [designId,account?.id ?? null,ownerKey],
  ) as Array<any>;

  const room=rows[0];
  if(!room) return new Response("Not found",{status:404});

  const original=room.original_external || (room.original_base64 && room.original_mime
    ? `data:${room.original_mime};base64,${room.original_base64}`
    : null);
  const after=room.result_external || (room.result_base64 && room.result_mime
    ? `data:${room.result_mime};base64,${room.result_base64}`
    : null);
  if(!after) return new Response("Image unavailable",{status:404});

  const total=typeof room.product_selection?.totalMinor==="number"
    ? room.product_selection.totalMinor
    : null;
  const vertical=config.layout==="vertical";

  return new ImageResponse(
    (
      <div style={{
        width:"100%",height:"100%",display:"flex",flexDirection:"column",
        background:"#f2ede4",color:"#182019",fontFamily:"Arial, sans-serif",
      }}>
        <div style={{
          height:vertical ? "12%" : "17%",display:"flex",alignItems:"center",
          justifyContent:"space-between",padding:vertical ? "0 58px" : "0 48px",
          borderBottom:"1px solid #b8b4aa",
        }}>
          <span style={{fontFamily:"Georgia, serif",fontSize:vertical ? 42 : 32}}>Roomfound</span>
          <span style={{fontSize:vertical ? 18 : 14,textTransform:"uppercase",letterSpacing:2}}>Real room · real products</span>
        </div>

        <div style={{
          flex:1,display:"flex",flexDirection:vertical ? "column" : "row",
          position:"relative",
        }}>
          {original ? (
            <div style={{flex:1,display:"flex",position:"relative",overflow:"hidden"}}>
              <img src={original} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
              <span style={{
                position:"absolute",left:24,top:24,padding:"10px 14px",
                background:"rgba(245,242,235,.9)",fontSize:vertical ? 22 : 16,fontWeight:700,
              }}>BEFORE</span>
            </div>
          ) : null}

          <div style={{flex:original ? 1 : 2,display:"flex",position:"relative",overflow:"hidden"}}>
            <img src={after} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
            <span style={{
              position:"absolute",left:24,top:24,padding:"10px 14px",
              background:"rgba(24,32,25,.86)",color:"white",fontSize:vertical ? 22 : 16,fontWeight:700,
            }}>AFTER</span>
          </div>
        </div>

        <div style={{
          minHeight:vertical ? "19%" : "24%",display:"flex",flexDirection:vertical ? "column" : "row",
          alignItems:vertical ? "flex-start" : "center",justifyContent:"space-between",
          gap:20,padding:vertical ? "42px 58px" : "28px 48px",background:"#172019",color:"white",
        }}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <span style={{fontSize:vertical ? 18 : 13,textTransform:"uppercase",letterSpacing:2,color:"#c7cfc7"}}>
              {room.room_name || "Living room"}
            </span>
            <strong style={{fontFamily:"Georgia, serif",fontWeight:400,fontSize:vertical ? 50 : 35}}>
              {money(total)}
            </strong>
          </div>
          <span style={{
            border:"1px solid #8b968d",borderRadius:999,padding:vertical ? "16px 23px" : "12px 18px",
            fontSize:vertical ? 18 : 13,fontWeight:700,
          }}>roomfound · design a room you can actually buy</span>
        </div>
      </div>
    ),
    {
      width:config.width,
      height:config.height,
      headers:{
        "Content-Disposition":`inline; filename="roomfound-${format}-${designId}.png"`,
        "Cache-Control":"private, max-age=300",
      },
    },
  );
}
