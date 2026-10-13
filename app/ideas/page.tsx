import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { listGrowthCollections } from "@/lib/growth";

import { IdeasPreview } from '@/components/IdeasPreview';
import styles from '@/components/IdeasPreview.module.css';

export const dynamic="force-dynamic";

// The collection preview remains available while publishing data is being prepared.
const getCollections = cache(async () => {
  try {
    return await listGrowthCollections();
  } catch {
    console.error("Ideas collections unavailable; showing the collection preview.");
    return [];
  }
});

export async function generateMetadata():Promise<Metadata>{
  const collections=await getCollections();
  const hasRooms=collections.some((collection)=>collection.roomCount>0);
  return {
    title:{absolute:"Room ideas and inspiration | Roomfound"},
    description:"Find inspiration for your home with Roomfound. Our first room-design collection is coming soon; explore an example living room today.",
    robots:{index:hasRooms,follow:true},
    openGraph:{title:"Room ideas and inspiration | Roomfound",description:hasRooms ? "Explore room designs and find a style for your home." : "Our first room-design collection is coming soon. Explore the Roomfound example living room."},
  };
}

export default async function IdeasPage(){
  const collections=await getCollections();

  const published = collections.filter(collection=>collection.roomCount>0);
  return (
    <main className={styles.page}>
      <Header preview anchorBase="/" />
      <section className={styles.intro}>
        <p className="eyebrow">Roomfound ideas</p>
        <h1>Room ideas for your home.</h1>
        <p>Find a style you love and discover the details that bring a room together.</p>
      </section>

      {published.length ? <section className="growthCollectionGrid shellWide" aria-label="Room design collections">
        {published.map((collection)=>(
          <Link className="growthCollectionCard" href={`/ideas/${collection.slug}`} key={collection.slug}>
            {collection.featuredImageUrl ? (
              <div className="growthCollectionVisual"><img src={collection.featuredImageUrl} alt="" /></div>
            ) : null}
            <span>{collection.eyebrow || "Living-room ideas"}</span>
            <h2>{collection.title}</h2>
            <p>{collection.intro}</p>
            <div><strong>{collection.roomCount}</strong><small>{collection.roomCount===1 ? "real room" : "real rooms"} published</small></div>
            <em>Explore collection →</em>
          </Link>
        ))}
      </section> : <IdeasPreview />}
      <Link className={styles.back} href="/">Back to Roomfound</Link>
    </main>
  );
}
