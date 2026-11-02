import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palmier Pro for Windows — AI Video Editor",
  description:
    "Palmier Pro for Windows 10 — an AI-native video editor with timeline, MCP server, and built-in agent chat. Built for Windows with Electron + Next.js.",
  keywords: [
    "Palmier Pro",
    "video editor",
    "Windows 10",
    "AI video",
    "MCP",
    "Claude",
    "Cursor",
    "timeline editor",
  ],
  authors: [{ name: "Palmier, Inc. (Windows port)" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
