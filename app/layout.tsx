import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CustomCursor } from "@/components/CustomCursor";
import { Providers } from "./providers"; // provider import

export const metadata: Metadata = {
  title: "Zeitgeist | Портал свободных исследований",
  description: "Портал свободных исследований.",
  icons: {
    icon: "/other/tab-icon.jpg",
    shortcut: "/other/tab-icon.jpg",
    apple: "/other/tab-icon.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Space+Grotesk:wght@400;500&family=Courier+Prime:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col antialiased transition-colors duration-300">
        <div className="noise-overlay"></div>
        <CustomCursor />
        <Providers>
          <Header />
          <main className="page-content flex-grow">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
