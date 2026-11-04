import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ProductSelectionExperience } from "@/components/ProductSelectionExperience";

export default function ProductsPage() {
  return (
    <main className="productSelectionPage">
      <header className="designHeader shellWide">
        <Brand />
        <span className="designHeaderNote">Step 2 of 4 · Personalise your collection</span>
        <Link className="textLink" href="/design?step=1">Change group · Step 2</Link>
      </header>
      <ProductSelectionExperience />
    </main>
  );
}
