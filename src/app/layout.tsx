import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Market Bubble's brand face: a high-contrast editorial serif.
const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Market Bubble — Command Deck",
  description:
    "One real-time feed for Twitch, Kick and X. Watch every stream and merge every chat into a single command deck.",
  applicationName: "Market Bubble Command Deck",
  openGraph: {
    title: "Market Bubble — Command Deck",
    description:
      "Unified live chat for Twitch + Kick + X with source labels, live viewer routing and a native multi-stream dashboard.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070707",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
