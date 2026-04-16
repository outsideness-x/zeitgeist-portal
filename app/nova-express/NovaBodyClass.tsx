"use client";

import { useEffect } from "react";

export function NovaBodyClass() {
  useEffect(() => {
    document.documentElement.classList.add("route-nova");
    document.body.classList.add("nova-page");

    return () => {
      document.documentElement.classList.remove("route-nova");
      document.body.classList.remove("nova-page");
    };
  }, []);

  return null;
}
