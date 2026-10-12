import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CleanPost — Privacy-First Metadata & AI Provenance Cleaner',
  description:
    'Strip sensitive EXIF, GPS location coordinates, device serials, and AI generation metadata from images and videos before sharing to social media platforms. Ephemeral processing with zero file retention.',
  keywords: [
    'metadata cleaner',
    'exif remover',
    'gps photo stripper',
    'c2pa content credentials',
    'ai provenance remover',
    'sanitize image',
    'strip video metadata',
    'privacy photo',
  ],
  authors: [{ name: 'CleanPost Privacy Team' }],
  openGraph: {
    title: 'CleanPost — Protect Your Privacy Before You Post',
    description:
      'Remove hidden EXIF, GPS tracking, and generative AI indicators from images and videos.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
