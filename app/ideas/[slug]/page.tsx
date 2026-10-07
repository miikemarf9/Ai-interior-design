import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getGrowthCollection, siteUrl } from "@/lib/growth";

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
      <Header />
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
        <section className="growthEmpty shellWide">
          <span className="microLabel">Not published yet</span>
          <h2>We are waiting for real rooms, not filling the page with generic content.</h2>
          <p>This collection remains out of search until enough genuine Roomfound designs qualify.</p>
          <Link className="button buttonPrimary" href="/design">Design my room</Link>
        </section>
      )}
    </main>
  );
}
