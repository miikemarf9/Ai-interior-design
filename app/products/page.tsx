import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ProductSelectionExperience } from "@/components/ProductSelectionExperience";

export default function ProductsPage() {
  return (
    <main className="productSelectionPage">
      <header className="designHeader shellWide">
        <Brand />
        <span className="designHeaderNote">Step 3 of 4 · Free</span>
        <Link className="textLink" href="/design?step=1">Back to style and budget</Link>
      </header>
      <ProductSelectionExperience />
    </main>
  );
}
