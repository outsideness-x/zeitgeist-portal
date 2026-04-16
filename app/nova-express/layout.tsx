import type { ReactNode } from "react";
import Script from "next/script";
import { NovaBodyClass } from "./NovaBodyClass";

const novaRouteThemeScript = `
  document.documentElement.classList.add('route-nova');
  if (document.body) {
    document.body.classList.add('nova-page');
  }
`;

export default function NovaExpressLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script id="nova-route-theme" strategy="beforeInteractive">
        {novaRouteThemeScript}
      </Script>
      <NovaBodyClass />
      {children}
    </>
  );
}
