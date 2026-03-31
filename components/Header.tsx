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
    { href: '/products', label: 'Товары' },
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

  const isItemActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navItemBaseClassName = "inline-flex max-w-full items-center justify-center rounded-full px-3 py-2 text-center leading-tight transition-colors xl:px-3.5";
  const getNavItemClassName = (path: string) => isItemActive(path)
    ? `${navItemBaseClassName} border border-accent/25 bg-[color:var(--accent-soft)] text-accent shadow-[0_14px_30px_rgba(141,67,57,0.09)]`
    : `${navItemBaseClassName} text-[color:var(--muted-strong)] hover:bg-black/5 hover:text-ink dark:text-[color:var(--muted)] dark:hover:bg-white/5 dark:hover:text-white`;

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
      <header className="sticky top-0 z-50 border-b border-[color:var(--line-soft)] bg-paper/85 backdrop-blur-xl transition-all duration-300 supports-[backdrop-filter]:bg-paper/75 dark:bg-[#120f0e]/82">
        <div className="page-shell">
          <div className="flex min-h-[4.75rem] items-center justify-between gap-2 py-3 sm:min-h-[5.25rem] sm:gap-3">
            <div className="flex shrink-0 items-center xl:hidden">
              <button
                ref={triggerRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] shadow-[var(--shadow-soft)] transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            <div className="flex min-w-0 flex-1 items-center">
              <Link href="/" className="inline-flex min-w-0 flex-col leading-none text-ink transition-colors hover:text-accent dark:text-gray-100">
                <span className="font-display text-[clamp(1.2rem,4.8vw,1.75rem)] tracking-[clamp(0.12em,0.65vw,0.22em)]">ZEITGEIST</span>
                <span className="mt-1 hidden font-sans text-[0.58rem] font-medium uppercase tracking-[0.3em] text-[color:var(--muted)] 2xl:block">
                  portal for eastern studies
                </span>
              </Link>
            </div>

            {/* desktop navigation */}
            <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.14em] xl:flex" aria-label="Основная навигация">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={getNavItemClassName(item.href)}
                  aria-current={isItemActive(item.href) ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* actions */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />

              <Link
                href="/upload"
                className="hidden items-center rounded-full border border-accent/30 bg-[color:var(--accent-soft)] px-3.5 py-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-accent transition-all duration-300 hover:border-accent hover:bg-accent hover:text-white xl:inline-flex"
              >
                Загрузить
              </Link>

              {user ? (
                <div className="hidden items-center gap-2.5 font-sans text-sm xl:flex">
                  <UserAvatar name={user.name} avatarUrl={user.avatarDataUrl ?? null} />
                  <button onClick={() => void handleLogout()} className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] transition-colors hover:text-red-500">Выйти</button>
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="hidden font-sans text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-strong)] transition-colors hover:text-accent dark:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent xl:inline-flex"
                >
                  {loading ? '...' : 'Войти'}
                </button>
              )}
            </div>
          </div>
        </div>
        {authError && (
          <div className="page-shell pb-3">
            <p className="text-sm text-red-600">{authError}</p>
          </div>
        )}

        {isMenuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 xl:hidden"
              aria-label="Закрыть мобильную навигацию"
              onClick={closeMenu}
            />
            <div id="mobile-menu" className="page-shell relative z-50 pb-5 xl:hidden" aria-label="Мобильная навигация">
              <div className="site-panel mt-3 overflow-hidden rounded-[1.75rem] px-4 py-5 sm:px-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-accent">Навигация</p>
                    <p className="mt-2 max-w-[14rem] font-serif text-sm leading-relaxed text-[color:var(--muted)]">
                      Разделы собраны вокруг чтения, исследований и архивной публикации.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label="Закрыть меню"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] shadow-[var(--shadow-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <nav className="flex flex-col gap-2 font-sans text-sm font-semibold uppercase tracking-[0.14em]">
                  {navItems.map((item, index) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      ref={index === 0 ? firstNavLinkRef : undefined}
                      className={`${getNavItemClassName(item.href)} text-left`}
                      aria-current={isItemActive(item.href) ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--line-soft)] pt-5 sm:flex-row sm:flex-wrap sm:items-center">
                  <Link
                    href="/upload"
                    className="inline-flex w-full items-center justify-center rounded-full border border-accent/30 bg-[color:var(--accent-soft)] px-4 py-2 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-accent transition-all duration-300 hover:border-accent hover:bg-accent hover:text-white sm:w-auto"
                    onClick={closeMenu}
                  >
                    Загрузить
                  </Link>

                  {!user ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        openAuthModal();
                      }}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--line-soft)] px-4 py-2 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent sm:w-auto"
                    >
                      Войти
                    </button>
                  ) : (
                    <div className="w-full rounded-[1.35rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4 sm:min-w-[18rem] sm:flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={user.name} avatarUrl={user.avatarDataUrl ?? null} />
                          <div className="min-w-0">
                            <p className="truncate font-sans text-sm font-semibold text-ink dark:text-gray-100">
                              {user.name}
                            </p>
                            <p className="font-sans text-[0.66rem] uppercase tracking-[0.16em] text-[color:var(--muted)]">
                              {user.role === 'ADMIN' ? 'администратор' : 'профиль активен'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="shrink-0 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-strong)] transition-colors hover:text-red-500"
                        >
                          Выйти
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={closeAuthModal} />
    </>
  );
};
