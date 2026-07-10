import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import UnregisterStaleServiceWorker from "@/app/components/UnregisterStaleServiceWorker";
import AuthNav from "@/app/components/AuthNav";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Community Needs Board",
  description: "Local charities post what they need. Anyone can help.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UnregisterStaleServiceWorker />
        <header style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div className="nav-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <a
                href="/"
                style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: 'var(--color-green)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
                  letterSpacing: '-0.01em',
                }}
              >
                Community Needs Board
              </a>
              <a
                href="/impact"
                style={{
                  fontSize: '13px',
                  color: 'var(--color-sage)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                Impact
              </a>
              <a
                href="/events"
                style={{
                  fontSize: '13px',
                  color: 'var(--color-sage)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                Events
              </a>
            </div>
            <AuthNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
