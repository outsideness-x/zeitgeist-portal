"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { mapOAuthErrorCodeToMessage, buildAuthCallbackPath } from '@/services/auth/oauth';
import { AuthModal, type AuthModalIntent } from './AuthModal';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { UserAvatar } from './UserAvatar';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthModalIntent>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, logout } = useAuth();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);
  const wasMenuOpenRef = useRef(false);
  const authIntentCounterRef = useRef(0);

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
  const desktopNavItems = [
    { href: '/journal', label: 'Журнал' },
    { href: '/library', label: 'Архив' },
    { href: '/research', label: 'Исследования' },
    { href: '/nova-express', label: 'Nova Express' },
  ];

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
    setAuthIntent(null);
    setAuthOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthIntent(null);
    setAuthOpen(false);
  }, []);

  const handleIntentHandled = useCallback((intentId: number) => {
    setAuthIntent((current) => {
      if (!current || current.id !== intentId) {
        return current;
      }
      return null;
    });
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const search = window.location.search;
    const params = new URLSearchParams(search);

    const authFlag = params.get('auth');
    const authErrorCode = params.get('auth_error');
    const authDebugCode = params.get('auth_debug_code');

    if (!authFlag && !authErrorCode) {
      return;
    }

    const cleanPath = buildAuthCallbackPath(pathname, search);
    router.replace(cleanPath, { scroll: false });

    if (user) {
      return;
    }

    if (authFlag === '2fa') {
      authIntentCounterRef.current += 1;
      setAuthIntent({
        id: authIntentCounterRef.current,
        type: 'two-factor',
        ...(authDebugCode ? { debugCode: authDebugCode } : {}),
      });
      setAuthOpen(true);
      return;
    }

    if (authErrorCode) {
      authIntentCounterRef.current += 1;
      setAuthIntent({
        id: authIntentCounterRef.current,
        type: 'oauth-error',
        message: mapOAuthErrorCodeToMessage(authErrorCode) ?? undefined,
      });
      setAuthOpen(true);
    }
  }, [pathname, router, user]);

  useEffect(() => {
    const syncScrolledState = () => {
      setIsScrolled(window.scrollY > 8);
    };

    const handleResize = () => {
      if (window.innerWidth >= 900) {
        setMenuOpen(false);
      }
    };

    syncScrolledState();
    handleResize();

    window.addEventListener('scroll', syncScrolledState, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', syncScrolledState);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`} role="banner">
        <div className="page-shell">
          <div className="site-header-inner">
            <div className="site-header-leading">
              <button
                ref={triggerRef}
                type="button"
                className="burger inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--muted-strong)] shadow-[var(--shadow-soft)] transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

              <Link href="/" className="site-logo" aria-label="Zeitgeist — главная">
                ZEITGEIST
              </Link>
            </div>

            <nav className="main-nav" aria-label="Основная навигация">
              {desktopNavItems.map((item) => {
                const isActive = isItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="site-header-actions">
              {!user ? (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="desktop-auth-link"
                >
                  Войти
                </button>
              ) : (
                <Link href={user.role === 'ADMIN' ? '/admin' : '/account'} className="desktop-auth-link desktop-auth-link--user">
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarDataUrl ?? null}
                    sizeClassName="h-8 w-8"
                    textClassName="text-xs"
                    className="shrink-0"
                  />
                  <span className="hidden xl:inline">{user.role === 'ADMIN' ? 'Админ' : 'Кабинет'}</span>
                </Link>
              )}

              <ThemeToggle className="theme-toggle" />
            </div>
          </div>
        </div>
        {authError && (
          <div className="page-shell pointer-events-none">
            <div className="site-header-alert pointer-events-auto">
              <p className="text-sm text-red-600">{authError}</p>
            </div>
          </div>
        )}

        {isMenuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40"
              aria-label="Закрыть мобильную навигацию"
              onClick={closeMenu}
            />
            <div id="mobile-menu" className="page-shell relative z-50 pb-5" aria-label="Мобильная навигация">
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

      <AuthModal
        isOpen={isAuthOpen}
        onClose={closeAuthModal}
        intent={authIntent}
        onIntentHandled={handleIntentHandled}
      />
    </>
  );
};
