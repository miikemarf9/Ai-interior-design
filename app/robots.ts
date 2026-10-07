import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/growth";

export default function robots():MetadataRoute.Robots{
  const base=siteUrl();
  return {
    rules:{
      userAgent:"*",
      allow:["/","/ideas/","/rooms/","/api/growth/rooms/"],
      disallow:["/account","/brief","/products","/render","/api/"],
    },
    sitemap:`${base}/sitemap.xml`,
  };
}
