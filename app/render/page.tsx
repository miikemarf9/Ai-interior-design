import Link from "next/link";
import { Brand } from "@/components/Brand";
import { RenderExperience } from "@/components/RenderExperience";

export default function RenderPage() {
  return (
    <main className="renderPage">
      <header className="designHeader shellWide">
        <Brand />
        <span className="designHeaderNote">Room visual · 1 image use</span>
        <Link className="textLink" href="/products">Back to furniture</Link>
      </header>
      <RenderExperience />
    </main>
  );
}
