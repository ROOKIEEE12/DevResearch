import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevResearch - AI Research Assistant for Developers",
  description: "Search across Web, Papers, GitHub, Reddit/HN, and YouTube transcripts to produce a cited, synthesized technical brief.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-400"
      >
        {children}
      </body>
    </html>
  );
}
