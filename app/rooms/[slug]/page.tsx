import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getGrowthPublication, getLiveGrowthProducts, siteUrl } from "@/lib/growth";

export const dynamic="force-dynamic";

function money(minor:number|null){
  if(minor===null) return "—";
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(minor/100);
}

export async function generateMetadata({
  params,
}:{
  params:Promise<{slug:string}>;
}):Promise<Metadata>{
  const {slug}=await params;
  const room=await getGrowthPublication(slug);
  if(!room) return {};
  const base=siteUrl();
  return {
    title:{absolute:`${room.title} | Shop the room | Roomfound`},
    description:room.excerpt,
    alternates:{canonical:`${base}/rooms/${room.slug}`},
    robots:{index:room.verificationStatus!=="failed",follow:true},
    openGraph:{
      type:"article",
      title:room.title,
      description:`${room.excerpt} Complete room: ${money(room.roomTotalMinor)}.`,
      url:`${base}/rooms/${room.slug}`,
      images:[{url:`${base}${room.imageUrl}`,alt:room.title}],
    },
  };
}

export default async function PublicRoomPage({
  params,
}:{
  params:Promise<{slug:string}>;
}){
  const {slug}=await params;
  const room=await getGrowthPublication(slug);
  if(!room) notFound();
  const products=await getLiveGrowthProducts(room.selection);
  const liveTotal=products.reduce((sum,product)=>sum+(product.priceMinor || 0),0);
  const hasAllLivePrices=products.length>0 && products.every((product)=>product.priceMinor!==null);
  const total=hasAllLivePrices ? liveTotal : room.roomTotalMinor;
  const base=siteUrl();

  const jsonLd={
    "@context":"https://schema.org",
    "@type":"CreativeWork",
    name:room.title,
    description:room.excerpt,
    url:`${base}/rooms/${room.slug}`,
    image:`${base}${room.imageUrl}`,
    datePublished:room.publishedAt || undefined,
    isPartOf:{"@type":"WebSite",name:"Roomfound",url:base},
  };

  return (
    <main className="growthPage publicRoomPage">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />

      <section className="publicRoomHero">
        <img src={room.imageUrl} alt={room.title} fetchPriority="high" decoding="async" />
        <div className="publicRoomShade" />
        <div className="publicRoomHeroCopy">
          <p>Real Roomfound design · {products.length} products</p>
          <h1>{room.title}</h1>
          <strong>{money(total)} <span>current room total</span></strong>
        </div>
      </section>

      <section className="publicRoomStory shellWide">
        <div>
          <p className="eyebrow">The design</p>
          <h2>{room.brief?.direction || room.title}</h2>
          <p>{room.excerpt}</p>
        </div>
        <aside>
          <div><span>Verification</span><strong>{room.verificationStatus ? room.verificationStatus.replaceAll("_"," ") : "Evidence pending"}</strong></div>
          <div><span>Products</span><strong>{products.length}</strong></div>
          <div><span>Current total</span><strong>{money(total)}</strong></div>
        </aside>
      </section>

      <section className="publicRoomProducts shellWide">
        <div className="publicRoomProductsHeading">
          <p className="eyebrow">Shop this room</p>
          <h2>The actual products.</h2>
          <p className="affiliateDisclosure">Retailer links may be affiliate links. Roomfound may earn a commission if you buy after following one.</p>
        </div>

        <div className="publicProductGrid">
          {products.map((product)=>(
            <article className="publicProduct" key={product.variantId}>
              <div className="publicProductImage">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} loading="lazy" decoding="async" /> : <span>Image unavailable</span>}
              </div>
              <small>{product.slot.replaceAll("-"," ")}</small>
              <h3>{product.productName}{product.variantName ? ` · ${product.variantName}` : ""}</h3>
              <div className="publicProductBuy">
                <strong>{money(product.priceMinor)}</strong>
                {product.offerId ? (
                  <a href={`/go/${product.offerId}?designId=${room.designId}&generationId=${room.generationId}&surface=seo_room`} rel="sponsored">
                    View at retailer
                  </a>
                ) : <span>Live retailer unavailable</span>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="publicRoomCta">
        <p className="eyebrow eyebrowLight">Start with your own room</p>
        <h2>Design a room you can actually buy.</h2>
        <Link className="button buttonLight" href="/design">Design my room</Link>
      </section>
    </main>
  );
}
