import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ProductSelectionExperience } from "@/components/ProductSelectionExperience";

export default function ProductsPage() {
  return (
    <main className="productSelectionPage">
      <header className="designHeader shellWide">
        <Brand />
        <span className="designHeaderNote">Step 5 of 6 · About 2 minutes · Free</span>
        <Link className="textLink" href="/brief">Back to design brief</Link>
      </header>
      <ProductSelectionExperience />
    </main>
  );
}
