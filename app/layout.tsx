import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "./providers"; // provider import

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
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-paper text-ink font-serif flex flex-col min-h-screen antialiased transition-colors duration-300">
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
