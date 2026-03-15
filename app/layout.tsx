import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Lato } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers"; // provider import

const cinzel = Cinzel({
  subsets: ["latin", "latin-ext"],
  variable: "--font-cinzel",
});

const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-cormorant",
});

const lato = Lato({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "Zeitgeist | Портал востоковедческих исследований",
  description: "Цифровой портал для исследователей-востоковедов.",
  icons: {
    icon: "/other/tab-icon.jpg",
    shortcut: "/other/tab-icon.jpg",
    apple: "/other/tab-icon.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${cinzel.variable} ${cormorant.variable} ${lato.variable}`}
    >
      <body className="bg-paper text-ink font-serif flex flex-col min-h-screen antialiased transition-colors duration-300">
        <div className="noise-overlay"></div>
        <Providers>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
