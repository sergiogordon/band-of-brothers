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
  title: "Band of Brothers",
  description:
    "Season leaderboard, timeline, and what-if simulator for the Band of Brothers men's group.",
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
