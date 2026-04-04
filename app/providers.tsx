"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { SiteActivityTracker } from "@/components/analytics/SiteActivityTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AuthProvider>
        <SiteActivityTracker />
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
