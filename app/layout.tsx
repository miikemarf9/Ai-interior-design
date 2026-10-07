import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: `${site.name} — ${site.proposition}`,
  description: site.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
