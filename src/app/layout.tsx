import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SeasonProvider } from "@/components/SeasonProvider";
import { getSeasonState } from "@/lib/db/season";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bandofbrothers.vercel.app"),
  title: "Band of Brothers",
  description:
    "Season leaderboard, timeline, and what-if simulator for the Band of Brothers men's group.",
  openGraph: {
    title: "Band of Brothers",
    description:
      "Season leaderboard, timeline, and what-if simulator for the Band of Brothers men's group.",
    url: "/",
    siteName: "Band of Brothers",
    images: [
      {
        url: "/brand/band-of-brothers-og.png",
        width: 1200,
        height: 630,
        alt: "Band of Brothers 2026 season crest and leaderboard preview.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Band of Brothers",
    description:
      "Season leaderboard, timeline, and what-if simulator for the Band of Brothers men's group.",
    images: ["/brand/band-of-brothers-og.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = await getSeasonState();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#030806] text-stone-100">
        <SeasonProvider initialState={initialState}>{children}</SeasonProvider>
      </body>
    </html>
  );
}
