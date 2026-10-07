import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';
import { site } from '@/lib/site';
import { AnalyticsClient, CookieConsent } from '@/components/PrivacyAnalytics';
import { LegalFooter } from '@/components/LegalFooter';

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const sansFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${site.name} — ${site.proposition}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    siteName: site.name,
    type: 'website',
    title: `${site.name} — ${site.proposition}`,
    description: site.description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className={`${displayFont.variable} ${sansFont.variable}`}>
        <a className="skipLink" href="#roomfound-main">Skip to main content</a>
        <div id="roomfound-main">{children}</div>
        <LegalFooter />
        <CookieConsent />
        <AnalyticsClient />
      </body>
    </html>
  );
}
