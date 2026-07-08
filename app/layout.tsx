import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UnregisterStaleServiceWorker from "@/app/components/UnregisterStaleServiceWorker";
import AuthNav from "@/app/components/AuthNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UnregisterStaleServiceWorker />
        <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <div className="nav-inner">
            <a
              href="/"
              style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#1D6A48',
                textDecoration: 'none',
                fontFamily: 'sans-serif',
              }}
            >
              Community Needs Board
            </a>
            <AuthNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
