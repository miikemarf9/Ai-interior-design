import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { listGrowthCollections } from "@/lib/growth";

export async function generateMetadata():Promise<Metadata>{
  const collections=await listGrowthCollections();
  const hasRooms=collections.some((collection)=>collection.roomCount>0);
  return {
    title:"Living-room ideas built from real rooms | Roomfound",
    description:"Explore living-room ideas built from real Roomfound designs, real UK products and visible room totals.",
    robots:{index:hasRooms,follow:true},
  };
}

export default async function IdeasPage(){
  const collections=await listGrowthCollections();

  return (
    <main className="growthPage">
      <Header />
      <section className="growthHero shellWide">
        <p className="eyebrow">Roomfound ideas</p>
        <h1>Ideas you can actually shop.</h1>
        <p>Not 800 words wrapped around stock photography. These pages fill with real Roomfound designs, real selected products and visible room totals.</p>
      </section>

      <section className="growthCollectionGrid shellWide">
        {collections.map((collection)=>(
          <Link className="growthCollectionCard" href={`/ideas/${collection.slug}`} key={collection.slug}>
            {collection.featuredImageUrl ? (
              <div className="growthCollectionVisual"><img src={collection.featuredImageUrl} alt="" /></div>
            ) : null}
            <span>{collection.eyebrow || "Living-room ideas"}</span>
            <h2>{collection.title}</h2>
            <p>{collection.intro}</p>
            <div><strong>{collection.roomCount}</strong><small>{collection.roomCount===1 ? "real room" : "real rooms"} published</small></div>
            <em>{collection.indexable ? "Live in search" : `Indexing starts at ${collection.minRoomsForIndex} real rooms`}</em>
          </Link>
        ))}
      </section>
    </main>
  );
}
