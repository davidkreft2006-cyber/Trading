import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AccountProvider } from '@/lib/AccountContext';
import { QuotesProvider } from '@/lib/quotes';
import { Footer, Header, MobileTabBar } from '@/components/Shell';
import { GlassFilter } from '@/components/ui/liquid-glass-button';

export const metadata: Metadata = {
  title: { default: 'Auvryn', template: '%s · Auvryn' },
  description: 'Krypto-Märkte, Handel und Wallet. Konto, Wallet und Handel mit Live-Kursen.',
  robots: { index: false, follow: false },
  // Vom iPhone-Home-Bildschirm aus als eigene App starten (ohne Safari-Leiste)
  appleWebApp: { capable: true, title: 'Auvryn', statusBarStyle: 'black' }
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: '#080d16',
  colorScheme: 'dark'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-[100dvh] flex-col overflow-x-clip pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-ctl focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow">
          Zum Inhalt springen
        </a>
        <QuotesProvider>
          <AccountProvider>
            <Header />
            <main id="inhalt" className="flex-1">{children}</main>
            <Footer />
            <MobileTabBar />
            <GlassFilter />
          </AccountProvider>
        </QuotesProvider>
      </body>
    </html>
  );
}
