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
  const minPriceRaw=Number(params.get("minPriceMinor") || "");
  const minPriceMinor=Number.isSafeInteger(minPriceRaw) && minPriceRaw>0 ? minPriceRaw : null;
  const maxWidthCm=positiveLimit(params.get("maxWidthCm"));
  const maxDepthCm=positiveLimit(params.get("maxDepthCm"));
  const maxHeightCm=positiveLimit(params.get("maxHeightCm"));
  const material=(params.get("material") || "").trim().toLowerCase();
  const colour=(params.get("colour") || "").trim().toLowerCase();
  const requiredFeatures=(params.get("features") || "").split(",").map(value=>value.trim().toLowerCase()).filter(Boolean);
  const candidates=await getLiveSelectionCandidates();
  const categoryItems=candidates.filter(item=>item.category===category && item.clearedForSelection===true && Boolean(item.image) && (!styleSlug || item.styles.includes(styleSlug)));
  const facets={
    materials:unique(categoryItems.flatMap(item=>item.materials)),
    colours:unique(categoryItems.flatMap(item=>item.colours)),
    features:unique(categoryItems.flatMap(item=>item.featureTags)),
    priceRange:priceBounds(categoryItems.map(item=>item.offer.priceMinor)),
  };

  const matches=candidates.filter(item=>{
    if(item.category!==category || item.clearedForSelection!==true || !item.image) return false;
    if(styleSlug && !item.styles.includes(styleSlug)) return false;
    if(maxPriceMinor!==null && item.offer.priceMinor>maxPriceMinor) return false;
    if(minPriceMinor!==null && item.offer.priceMinor<minPriceMinor) return false;
    if(maxWidthCm!==null && (!item.dimensions.widthMm || item.dimensions.widthMm>maxWidthCm*10)) return false;
    if(maxDepthCm!==null && (!item.dimensions.depthMm || item.dimensions.depthMm>maxDepthCm*10)) return false;
    if(maxHeightCm!==null && (!item.dimensions.heightMm || item.dimensions.heightMm>maxHeightCm*10)) return false;
    if(material && !item.materials.some(value=>value.toLowerCase()===material)) return false;
    if(colour && !item.colours.some(value=>value.toLowerCase()===colour)) return false;
    if(requiredFeatures.some(feature=>!item.featureTags.some(tag=>tag.toLowerCase()===feature))) return false;
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
        ...item.featureTags,
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
    seatWidthMm:item.dimensions.seatWidthMm,
    seatDepthMm:item.dimensions.seatDepthMm,
    seatHeightMm:item.dimensions.seatHeightMm,
    packSize:item.commercial?.packSize || 1,
    unitLabel:item.commercial?.unitLabel || "item",
    styles:item.styles,
    materials:item.materials,
    colours:item.colours,
    featureTags:item.featureTags,
  }));

  return NextResponse.json({products,total:matches.length,showing:products.length,facets});
}

function positiveLimit(value:string|null){
  const n=Number(value);
  return value && Number.isFinite(n) && n>0 && n<10000 ? n : null;
}

function unique(values:string[]){
  return Array.from(new Set(values)).sort((a,b)=>a.localeCompare(b));
}

function priceBounds(values:number[]){
  const prices=values.filter(value=>Number.isSafeInteger(value) && value>0);
  if(!prices.length) return {minMinor:0,maxMinor:500000};
  return {minMinor:Math.min(...prices),maxMinor:Math.max(...prices)};
}
