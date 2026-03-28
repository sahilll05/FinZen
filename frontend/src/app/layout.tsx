import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair",
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({ 
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "FinZen | Clarity in Every Market Move",
  description: "Institutional-grade financial intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased text-text-body bg-root min-h-screen selection:bg-accent-indigo-light selection:text-accent-indigo">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
