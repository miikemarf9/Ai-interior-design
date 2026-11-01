import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ProductSelectionExperience } from "@/components/ProductSelectionExperience";

export default function ProductsPage() {
  return (
    <main className="productSelectionPage">
      <header className="designHeader shellWide">
        <Brand />
        <span className="designHeaderNote">Furniture selection · free</span>
        <Link className="textLink" href="/brief">Back to design brief</Link>
      </header>
      <ProductSelectionExperience />
    </main>
  );
}
