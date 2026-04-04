"use client";

import { useTheme } from "next-themes";

type ThemeToggleProps = {
  className?: string;
};

export const ThemeToggle = ({ className = "" }: ThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = typeof resolvedTheme === "string";
  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] shadow-[var(--shadow-soft)] transition-colors hover:border-[color:var(--line-strong)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-11 sm:w-11 ${className}`.trim()}
      aria-label={mounted ? (isDark ? "Переключить на светлую тему" : "Переключить на темную тему") : "Переключить тему"}
      type="button"
    >
      {!mounted ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m0 16v2M4 12H2m20 0h-2m-2.343-5.657-1.414 1.414M7.757 16.243l-1.414 1.414m0-11.314 1.414 1.414m8.486 8.486 1.414 1.414" /></svg>
      ) : isDark ? (
        // Sun Icon
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      ) : (
        // Moon Icon
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      )}
    </button>
  );
};
