import type { Metadata } from 'next';
import { HomeHeroCarousel } from '@/components/HomeHeroCarousel';
import { Header } from '@/components/Header';
import { ScrollMotion } from '@/components/ScrollMotion';
import { HomeBelowHero } from '@/components/HomeBelowHero';

const title = 'Roomfound — See the potential in your room';
const description = 'Explore AI room-design inspiration for real UK homes, with ideas for your style, furniture budget and the pieces you want to keep. Currently in preview.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: 'Roomfound', type: 'website' },
};

export default function HomePage() {
  return (
    <main>
      <Header preview />
      <ScrollMotion />
      <HomeHeroCarousel />
      <HomeBelowHero />
    </main>
  );
}
