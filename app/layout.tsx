import type { Metadata, Viewport } from "next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "Guess Who — The Ultimate Celebrity Guessing Game",
  description:
    "Play Guess Who with footballers, cricketers, actors, celebrities and more. Ask questions, eliminate characters and guess who they are.",
  metadataBase: new URL("https://guess-who.example.com"),
  openGraph: {
    title: "Guess Who — The Ultimate Celebrity Guessing Game",
    description:
      "Play Guess Who with footballers, cricketers, actors, celebrities and more. Ask questions, eliminate characters and guess who they are.",
    type: "website",
    siteName: "Guess Who",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guess Who — The Ultimate Celebrity Guessing Game",
    description: "Ask smart. Eliminate faster. Guess right.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-bg text-text antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
