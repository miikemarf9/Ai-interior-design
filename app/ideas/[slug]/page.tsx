import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getGrowthCollection, siteUrl } from "@/lib/growth";

import { IdeasPreview } from '@/components/IdeasPreview';
import styles from '@/components/IdeasPreview.module.css';

export const dynamic="force-dynamic";

function money(minor:number|null){
  if(minor===null) return "Live price unavailable";
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(minor/100);
}

export async function generateMetadata({
  params,
}:{
  params:Promise<{slug:string}>;
}):Promise<Metadata>{
  const {slug}=await params;
  const collection=await getGrowthCollection(slug);
  if(!collection) return {};
  if(!collection.rooms.length) return {
    title:{absolute:`${collection.title} | Roomfound`},
    description:'A new collection of room designs is coming soon. Explore the Roomfound example living room in the meantime.',
    robots:{index:false,follow:true},
    openGraph:{title:`${collection.title} | Roomfound`,description:'A new room-design collection is coming soon.'},
  };
  const base=siteUrl();
  const first=collection.rooms[0];
  return {
    title:{absolute:collection.metaTitle},
    description:collection.metaDescription,
    alternates:{canonical:`${base}/ideas/${collection.slug}`},
    robots:{index:collection.indexable,follow:true},
    openGraph:{
      type:"website",
      title:collection.metaTitle,
      description:collection.metaDescription,
      url:`${base}/ideas/${collection.slug}`,
      images:first ? [{url:`${base}${first.imageUrl}`,alt:first.title}] : undefined,
    },
  };
}

export default async function GrowthCollectionPage({
  params,
}:{
  params:Promise<{slug:string}>;
}){
  const {slug}=await params;
  const collection=await getGrowthCollection(slug);
  if(!collection) notFound();

  if(!collection.rooms.length) return <main className={styles.page}>
    <Header preview anchorBase="/" />
    <section className={styles.intro}><p className="eyebrow">Roomfound ideas</p><h1>{collection.title}</h1><p>A new collection of room inspiration is on its way.</p></section>
    <IdeasPreview />
    <Link className={styles.back} href="/ideas">Back to all ideas</Link>
  </main>;

  const base=siteUrl();
  const jsonLd={
    "@context":"https://schema.org",
    "@type":"CollectionPage",
    name:collection.title,
    description:collection.intro,
    url:`${base}/ideas/${collection.slug}`,
    mainEntity:{
      "@type":"ItemList",
      itemListElement:collection.rooms.map((room,index)=>({
        "@type":"ListItem",
        position:index+1,
        url:`${base}/rooms/${room.slug}`,
        name:room.title,
      })),
    },
  };

  return (
    <main className="growthPage">
      <Header preview anchorBase="/" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />

      <section className="growthCollectionHero shellWide">
        <div>
          <p className="eyebrow">{collection.eyebrow || "Real Roomfound designs"}</p>
          <h1>{collection.title}</h1>
        </div>
        <p>{collection.intro}</p>
      </section>

      {collection.rooms.length ? (
        <section className="growthRoomGrid shellWide">
          {collection.rooms.map((room)=>(
            <article className="growthRoomCard" key={room.slug}>
              <Link href={`/rooms/${room.slug}`} className="growthRoomImage">
                <img src={room.imageUrl} alt={room.title} />
                <span>{room.verificationStatus==="verified" ? "Verified Room" : "Verification evidence available"}</span>
              </Link>
              <div className="growthRoomCardBody">
                <div>
                  <small>{room.productCount} real products</small>
                  <h2>{room.title}</h2>
                </div>
                <strong>{money(room.roomTotalMinor)}</strong>
                <p>{room.excerpt}</p>
                <Link href={`/rooms/${room.slug}`}>Explore and shop this room <span>→</span></Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <IdeasPreview />
      )}
    </main>
  );
}
