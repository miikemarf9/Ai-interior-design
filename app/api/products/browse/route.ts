import { NextResponse } from "next/server";
import { getLiveSelectionCandidates } from "@/lib/catalog/repository";

export const runtime="nodejs";

const categories=new Set([
  "sofas",
  "armchairs",
  "coffee-tables",
  "side-tables",
  "rugs",
  "floor-lamps",
  "table-lamps",
  "storage-cabinets",
  "tv-units",
]);
const styleSlugs:Record<string,string>={
  "Modern Organic":"warm-minimal",
  "Modern Country":"modern-british",
  "Japandi":"scandi",
  "Mid-Century Modern":"mid-century",
  "Bold & Colourful":"colourful",
  "Contemporary Classic":"classic",
};

export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const category=params.get("category") || "";
  if(!categories.has(category)) return NextResponse.json({error:"Choose a furniture category."},{status:400});

  const query=(params.get("q") || "").trim().slice(0,80).toLowerCase();
  const style=params.get("style") || "";
  const styleSlug=styleSlugs[style] || "";
  const priceRaw=Number(params.get("maxPriceMinor") || "");
  const maxPriceMinor=Number.isSafeInteger(priceRaw) && priceRaw>0 ? priceRaw : null;
  const candidates=await getLiveSelectionCandidates();

  const matches=candidates.filter(item=>{
    if(item.category!==category || item.clearedForSelection!==true || !item.image) return false;
    if(styleSlug && !item.styles.includes(styleSlug)) return false;
    if(maxPriceMinor!==null && item.offer.priceMinor>maxPriceMinor) return false;
    if(query){
      const haystack=[
        item.productName,
        item.variantName,
        item.brandName,
        item.categoryName,
        item.designSummary,
        item.offer.retailerName,
        ...item.styles,
        ...item.materials,
        ...item.colours,
      ].filter(Boolean).join(" ").toLowerCase();
      if(!haystack.includes(query)) return false;
    }
    return true;
  }).sort((a,b)=>b.curationScore-a.curationScore || b.qualityScore-a.qualityScore || a.offer.priceMinor-b.offer.priceMinor);

  const products=matches.slice(0,60).map(item=>({
    productId:item.productId,
    variantId:item.variantId,
    name:item.productName,
    variantName:item.variantName,
    brandName:item.brandName,
    categoryName:item.categoryName,
    retailerName:item.offer.retailerName,
    priceMinor:item.offer.priceMinor,
    availability:item.offer.availability,
    lastCheckedAt:item.offer.lastCheckedAt,
    imageUrl:item.image?.url || null,
    imageAlt:item.image?.altText || item.productName,
    widthMm:item.dimensions.widthMm,
    depthMm:item.dimensions.depthMm,
    heightMm:item.dimensions.heightMm,
    packSize:item.commercial?.packSize || 1,
    unitLabel:item.commercial?.unitLabel || "item",
    styles:item.styles,
    materials:item.materials,
    colours:item.colours,
  }));

  return NextResponse.json({products,total:matches.length,showing:products.length});
}
