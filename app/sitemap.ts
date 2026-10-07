import type { MetadataRoute } from "next";
import { growthSitemapEntries, siteUrl } from "@/lib/growth";

export const dynamic="force-dynamic";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=siteUrl();
  const growth=await growthSitemapEntries();
  return [
    {url:base,lastModified:new Date(),changeFrequency:"weekly",priority:1},
    {url:`${base}/design`,lastModified:new Date(),changeFrequency:"monthly",priority:.8},
    {url:`${base}/ideas`,lastModified:new Date(),changeFrequency:"weekly",priority:.8},
    ...growth.collections.map((item)=>({
      url:`${base}/ideas/${item.slug}`,
      lastModified:new Date(item.updated_at),
      changeFrequency:"weekly" as const,
      priority:.8,
    })),
    ...growth.rooms.map((item)=>({
      url:`${base}/rooms/${item.slug}`,
      lastModified:new Date(item.updated_at),
      changeFrequency:"daily" as const,
      priority:.9,
    })),
  ];
}
