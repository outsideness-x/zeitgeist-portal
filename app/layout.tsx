import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Merriweather, Prata } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers"; // provider import

const prata = Prata({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-prata",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-merriweather",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-manrope",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
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
      className={`${prata.variable} ${merriweather.variable} ${manrope.variable} ${ibmPlexMono.variable}`}
    >
      <body className="bg-paper text-ink font-serif flex min-h-screen flex-col antialiased transition-colors duration-300">
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
