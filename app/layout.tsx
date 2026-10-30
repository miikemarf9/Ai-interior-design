import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import './globals.css';
import { site } from '@/lib/site';
import { AnalyticsClient, CookieConsent } from '@/components/PrivacyAnalytics';
import { LegalFooter } from '@/components/LegalFooter';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${site.name} — ${site.proposition}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  other: {
    'affiliate-network': 'Awin',
  },
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (location.pathname !== '/' || navigation?.type !== 'reload') return;
            history.scrollRestoration = 'manual';
            if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
            const reset = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            reset();
            window.addEventListener('pageshow', () => {
              reset();
              requestAnimationFrame(reset);
            }, { once: true });
            window.addEventListener('pagehide', () => {
              history.scrollRestoration = 'auto';
            }, { once: true });
          })();
        ` }} />
      </head>
      <body style={{ '--font-display': "'Cormorant Garamond'", '--font-sans': "'Manrope'" } as CSSProperties}>
        <a className="skipLink" href="#roomfound-main">Skip to main content</a>
        <div id="roomfound-main">{children}</div>
        <LegalFooter />
        <CookieConsent />
        <AnalyticsClient />
      </body>
    </html>
  );
}
