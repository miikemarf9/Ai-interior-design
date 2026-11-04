import type { Metadata } from 'next';
import { HomeHeroCarousel } from '@/components/HomeHeroCarousel';
import { Header } from '@/components/Header';
import { ScrollMotion } from '@/components/ScrollMotion';
import { HomeBelowHero } from '@/components/HomeBelowHero';

const title = 'Transform My Room — Personalised room design & furniture selection';
const description = 'Sign up free for one room image credit every month. Plan a room around your style, furniture budget and reviewed UK retailer products.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: 'Transform My Room', type: 'website' },
};

export default function HomePage() {
  return (
    <main className="homePage">
      <Header preview />
      <ScrollMotion />
      <HomeHeroCarousel />
      <HomeBelowHero />
    </main>
  );
}
