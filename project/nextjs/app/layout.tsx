import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import { DemoProvider } from '@/lib/DemoContext';
import { DemoBanner, Footer, Header } from '@/components/Shell';

const archivo = Archivo({ subsets: ['latin'], weight: ['400', '600', '800'], variable: '--font-archivo' });

export const metadata: Metadata = {
  title: 'Kryo Demo – Krypto-Börse & Wallet (Design-Demo)',
  description: 'Fiktive Design-Demo. Kein echtes Konto, kein echtes Geld.',
  robots: { index: false, follow: false }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={archivo.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <DemoProvider>
          <DemoBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </DemoProvider>
      </body>
    </html>
  );
}
