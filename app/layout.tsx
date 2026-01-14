import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Lato } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers"; // provider import

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "600"], variable: "--font-cormorant", display: "swap" });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-lato", display: "swap" });

export const metadata: Metadata = {
  title: "Zeitgeist | Orientalist Research Portal",
  description: "A digital portal for Orientalist researchers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cinzel.variable} ${cormorant.variable} ${lato.variable} bg-paper text-ink font-serif flex flex-col min-h-screen antialiased transition-colors duration-300`}>
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