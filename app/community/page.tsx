import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { CommunityGallery } from "@/components/CommunityGallery";
import styles from "@/components/CommunityGallery.module.css";

export const metadata:Metadata={
  title:{absolute:"Community room designs | Transform My Room"},
  description:"Browse room designs shared by the Transform My Room community. Filter by room and style, then sort by trending or most liked.",
  robots:{index:false,follow:true},
};

export default function CommunityPage(){
  return (
    <main>
      <Header />
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Made by people like you</p>
        <h1>Rooms worth sharing.</h1>
        <p>Explore finished room designs, see the style and products behind each one, and give your favourites a thumbs-up.</p>
        <Link className="button buttonPrimary" href="/design">Create your room</Link>
      </section>
      <CommunityGallery />
    </main>
  );
}
