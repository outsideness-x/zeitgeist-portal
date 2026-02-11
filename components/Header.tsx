"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthModal } from './AuthModal';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{name: string} | null>(null);
  const navItems = [
    { href: '/research', label: 'Исследования' },
    { href: '/journal', label: 'Журнал' },
    { href: '/library', label: 'Библиотека' },
    { href: '/nova-express', label: 'Nova' },
    { href: '/team', label: 'Команда' },
  ];

  const isActive = (path: string) => pathname === path ? "text-accent border-b border-accent" : "text-ink hover:text-accent transition-colors dark:text-gray-300 dark:hover:text-white";

  const handleLoginSuccess = (username: string) => {
    setUser({ name: username });
    setAuthOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-sepia shadow-sm transition-all duration-300 dark:bg-black/90 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-display text-3xl tracking-widest text-ink hover:text-accent transition-colors dark:text-gray-100">
                ZEITGEIST
              </Link>
            </div>

            {/* desktop navigation */}
            <nav className="hidden md:flex space-x-6 items-center font-serif text-lg tracking-wide" aria-label="Основная навигация">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(item.href)}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* actions */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center h-10 w-10 border border-sepia dark:border-gray-700 text-ink dark:text-gray-200 hover:border-accent transition-colors"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              >
                {isMenuOpen ? 'X' : 'Меню'}
              </button>

              <ThemeToggle />

              <Link 
                href="/upload" 
                className="hidden md:inline-flex items-center px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-white transition-all font-sans text-xs uppercase tracking-wider duration-300"
              >
                Загрузить
              </Link>
              
              {user ? (
                <div className="flex items-center space-x-2 font-sans text-sm">
                   <div className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center font-bold">
                      {user.name.charAt(0)}
                   </div>
                   <button onClick={() => setUser(null)} className="text-gray-500 hover:text-red-500 text-xs uppercase">Выйти</button>
                </div>
              ) : (
                <button 
                  onClick={() => setAuthOpen(true)}
                  className="text-ink font-serif italic hover:text-accent transition-colors dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-sepia dark:border-gray-800 px-4 py-4 bg-paper dark:bg-black" aria-label="Мобильная навигация">
            <nav className="flex flex-col gap-3 font-serif text-lg">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(item.href)}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-white transition-all font-sans text-xs uppercase tracking-wider duration-300"
                onClick={() => setMenuOpen(false)}
              >
                Загрузить
              </Link>
              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthOpen(true);
                  }}
                  className="text-ink font-serif italic hover:text-accent transition-colors dark:text-gray-300"
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setAuthOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};
