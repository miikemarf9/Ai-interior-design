import type { Metadata } from 'next';
import { HomeHeroCarousel } from '@/components/HomeHeroCarousel';
import { Header } from '@/components/Header';
import { ScrollMotion } from '@/components/ScrollMotion';
import { HomeBelowHero } from '@/components/HomeBelowHero';

const title = 'Roomfound — Personalised room design & furniture selection';
const description = 'Turn your room photo into a personalised design with Roomfound. Plan around your style, furniture budget and the pieces you want to keep.';

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
