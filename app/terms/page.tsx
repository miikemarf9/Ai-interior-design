import type { Metadata } from "next";

export const metadata:Metadata={
  title:{absolute:"Beta terms and visualisation accuracy | Roomfound"},
  description:"Roomfound UK beta terms covering AI visualisations, product information, Verified Room evidence, design credits and affiliate retailer links.",
};

export default function TermsPage(){
  return (
    <main className="legalPage">
      <div className="legalPageInner shell">
        <p className="eyebrow">Controlled UK beta</p>
        <h1>Beta terms.</h1>
        <p className="legalLead">Roomfound is a visual planning and shopping aid. It helps you explore a room using real product references, but an AI-generated image is not a measured construction drawing, product photograph or professional safety assessment.</p>

        <section>
          <h2>Visualisation accuracy</h2>
          <p>AI images can differ from the real product or room. Shape, scale, placement, material appearance, lighting and colour can be represented imperfectly. A product shown in a generated room must not be treated as proof that it fits, can be delivered through an access route, meets a safety requirement or will look identical in person.</p>
          <p>Verified Room shows the evidence Roomfound actually has. A verified status is evidence for the named check only. Warnings and insufficient-data states are deliberately shown where the system cannot support a stronger conclusion.</p>
        </section>

        <section>
          <h2>Measurements and suitability</h2>
          <p>Check retailer dimensions and your own measurements before ordering. The first beta version of room-fit checking does not verify circulation clearances, doorway access, stairways, usable wall space, services, electrical requirements, fire safety or structural suitability.</p>
        </section>

        <section>
          <h2>Products, prices and stock</h2>
          <p>Retailer prices, availability, delivery terms and product specifications can change after Roomfound checks them. We refresh live offer information where our data source allows it, but the retailer page is the final source for the transaction. Recheck the product, variant, price, dimensions, delivery and returns terms before purchase.</p>
        </section>

        <section>
          <h2>Affiliate disclosure</h2>
          <p>Some retailer links are affiliate links. If you visit or buy from a retailer through one of those links, Roomfound may receive a commission. Affiliate economics do not turn a failed availability or verification check into a pass.</p>
        </section>

        <section>
          <h2>Design credits</h2>
          <p>Editing the written brief and reviewing products does not use a render credit. Starting an image generation uses one design credit. If Roomfound records the generation as failed, the beta credit system automatically returns that credit. Free or promotional design credits have no cash value unless a separate paid-credit product explicitly states otherwise.</p>
        </section>

        <section>
          <h2>Your uploads</h2>
          <p>Only upload room photographs and other material you are entitled to use. Remove or obscure information you do not want processed, including visible documents, addresses, faces or other unnecessary personal information.</p>
        </section>

        <section>
          <h2>Beta availability</h2>
          <p>The controlled beta can change, pause or limit features while reliability and unit economics are being validated. Roomfound should not be relied on for time-critical purchasing, building work or professional design or safety decisions.</p>
          <p className="legalReviewNote">Launch gate: these beta terms require final UK legal review before unrestricted public launch.</p>
        </section>
      </div>
    </main>
  );
}
