"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthModal } from './AuthModal';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { UserAvatar } from './UserAvatar';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, logout, loading } = useAuth();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);
  const wasMenuOpenRef = useRef(false);

  const baseNavItems = [
    { href: '/research', label: 'Исследования' },
    { href: '/journal', label: 'Журнал' },
    { href: '/library', label: 'Библиотека' },
    { href: '/nova-express', label: 'Nova' },
    { href: '/team', label: 'Команда' },
  ];

  const navItems = user
    ? [
      ...baseNavItems,
      { href: '/account', label: 'Кабинет' },
      ...(user.role === 'ADMIN' ? [{ href: '/admin', label: 'Админ' }] : []),
    ]
    : baseNavItems;

  const isActive = (path: string) => pathname === path ? "text-accent border-b border-accent" : "text-ink hover:text-accent transition-colors dark:text-gray-300 dark:hover:text-white";

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const openAuthModal = useCallback(() => {
    setAuthOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthOpen(false);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setAuthError(null);
      closeMenu();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось выйти из аккаунта');
    }
  };

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    // this keeps keyboard escape behavior aligned with dialog-like mobile navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // this moves focus to the first interactive item after the menu mounts
    window.requestAnimationFrame(() => {
      firstNavLinkRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    // this restores focus to the trigger after any close action
    if (wasMenuOpenRef.current && !isMenuOpen) {
      triggerRef.current?.focus();
    }
    wasMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    const handleOpenAuthModal = () => {
      openAuthModal();
    };

    window.addEventListener('zg:open-auth-modal', handleOpenAuthModal);
    return () => {
      window.removeEventListener('zg:open-auth-modal', handleOpenAuthModal);
    };
  }, [openAuthModal]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-sepia shadow-sm transition-all duration-300 dark:bg-black/90 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="md:hidden flex items-center">
              <button
                ref={triggerRef}
                type="button"
                className="inline-flex items-center justify-center h-11 w-11 appearance-none border-0 bg-transparent shadow-none text-ink dark:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              >
                {isMenuOpen ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-display text-3xl tracking-widest text-ink hover:text-accent transition-colors dark:text-gray-100">
                ZEITGEIST
              </Link>
            </div>

            {/* desktop navigation */}
            <nav className="hidden md:flex space-x-6 items-center font-serif text-xl tracking-wide" aria-label="Основная навигация">
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
              <ThemeToggle />

              <Link
                href="/upload"
                className="hidden md:inline-flex items-center px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-white transition-all font-sans text-xs uppercase tracking-wider duration-300"
              >
                Загрузить
              </Link>

              {user ? (
                <div className="flex items-center space-x-2 font-sans text-sm">
                  <UserAvatar name={user.name} avatarUrl={user.avatarDataUrl ?? null} />
                  <button onClick={() => void handleLogout()} className="text-gray-500 hover:text-red-500 text-xs uppercase">Выйти</button>
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="text-ink font-serif italic hover:text-accent transition-colors dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {loading ? '...' : 'Войти'}
                </button>
              )}
            </div>
          </div>
        </div>
        {authError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
            <p className="text-sm text-red-600">{authError}</p>
          </div>
        )}

        {isMenuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              aria-label="Закрыть мобильную навигацию"
              onClick={closeMenu}
            />
            <div id="mobile-menu" className="relative z-50 md:hidden border-t border-sepia dark:border-gray-800 px-4 py-4 bg-paper dark:bg-black" aria-label="Мобильная навигация">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Закрыть меню"
                  className="inline-flex items-center justify-center h-11 w-11 appearance-none border-0 bg-transparent shadow-none text-ink dark:text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <nav className="flex flex-col gap-3 font-serif text-xl">
                {navItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    ref={index === 0 ? firstNavLinkRef : undefined}
                    className={isActive(item.href)}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href="/upload"
                  className="inline-flex items-center px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-white transition-all font-sans text-xs uppercase tracking-wider duration-300"
                  onClick={closeMenu}
                >
                  Загрузить
                </Link>
                {!user && (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      openAuthModal();
                    }}
                    className="text-ink font-serif italic hover:text-accent transition-colors dark:text-gray-300"
                  >
                    Войти
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={closeAuthModal} />
    </>
  );
};
