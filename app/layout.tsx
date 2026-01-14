import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Lato } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Настройка шрифтов (Next.js скачает их и оптимизирует)
const cinzel = Cinzel({ 
  subsets: ["latin"], 
  variable: "--font-cinzel",
  display: "swap",
});

const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"], 
  weight: ["300", "400", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const lato = Lato({ 
  subsets: ["latin"], 
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeitgeist | Orientalist Research Portal",
  description: "A digital portal for Orientalist researchers featuring a journal, research catalog, and archive uploading capabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${cormorant.variable} ${lato.variable}`}>
      <body className="bg-paper text-ink font-serif flex flex-col min-h-screen antialiased selection:bg-accent selection:text-white">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}