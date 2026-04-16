"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { mapOAuthErrorCodeToMessage, buildAuthCallbackPath } from '@/services/auth/oauth';
import { AuthModal, type AuthModalIntent } from './AuthModal';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from './AuthProvider';
import { UserAvatar } from './UserAvatar';

type NavItem = {
  href: string;
  label: string;
};

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: '/journal', label: 'Журнал' },
  { href: '/research', label: 'Исследования' },
  { href: '/nova-express', label: 'Nova Express' },
  { href: '/courses', label: 'Курсы' },
  { href: '/products', label: 'Товары' },
  { href: '/team', label: 'Команда' },
];

const SECONDARY_LINKS: NavItem[] = [
  { href: '/upload', label: 'Отправить' },
  { href: '/donate', label: 'Поддержать' },
];

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthModalIntent>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const wasMenuOpenRef = useRef(false);
  const authIntentCounterRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNovaRoute = pathname === '/nova-express' || pathname.startsWith('/nova-express/');

  const isItemActive = useCallback((path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  }, [pathname]);

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

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setMenuVisible(true);

    if (typeof window === 'undefined') {
      setMenuOpen(true);
      return;
    }

    window.requestAnimationFrame(() => {
      setMenuOpen(true);
    });
  }, []);

  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
      return;
    }

    openMenu();
  }, [closeMenu, isMenuOpen, openMenu]);

  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeMenu();
    }
  }, [closeMenu]);

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
    if (!isMenuOpen && isMenuVisible) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }

      closeTimerRef.current = setTimeout(() => {
        setMenuVisible(false);
        closeTimerRef.current = null;
      }, 220);
    }

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isMenuOpen, isMenuVisible]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    window.requestAnimationFrame(() => {
      firstMobileLinkRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, isMenuOpen]);

  useEffect(() => {
    if (wasMenuOpenRef.current && !isMenuOpen) {
      triggerRef.current?.focus();
    }

    wasMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const syncScrolledState = () => {
      setIsScrolled(window.scrollY > 80);
    };

    let frame = 0;

    const handleScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        syncScrolledState();
        frame = 0;
      });
    };

    syncScrolledState();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

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

  return (
    <>
      <header className={`site-header ${isScrolled ? 'scrolled' : ''} ${isNovaRoute ? 'site-header--nova' : ''}`} role="banner">
        <Link href="/" className="site-header__logo" aria-label="Zeitgeist — главная">
          ZEITGEIST
        </Link>

        <nav className="site-header__nav-primary" aria-label="Основная навигация">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`site-header__nav-link ${isActive ? 'is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="site-header__nav-secondary">
          {SECONDARY_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`site-header__secondary-link ${item.href === '/donate' ? 'site-header__secondary-link--accent' : ''}`}
            >
              {item.label}
            </Link>
          ))}

          {!user ? (
            <button
              type="button"
              onClick={openAuthModal}
              className="site-header__secondary-link site-header__secondary-link--muted"
            >
              Войти
            </button>
          ) : (
            <Link
              href="/account"
              className={`site-header__secondary-link site-header__secondary-link--muted site-header__account-link ${isItemActive('/account') ? 'is-active' : ''}`}
              aria-current={isItemActive('/account') ? 'page' : undefined}
            >
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatarDataUrl ?? null}
                sizeClassName="h-8 w-8"
                textClassName="text-xs"
                className="shrink-0"
              />
              <span className="site-header__account-label">Кабинет</span>
            </Link>
          )}

          <ThemeToggle className="site-header__theme-toggle" />
        </div>

        <button
          ref={triggerRef}
          className="site-header__burger"
          type="button"
          aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-controls="mobile-nav-overlay"
          aria-expanded={isMenuOpen}
          onClick={toggleMenu}
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
      </header>

      {authError && (
        <div className="page-shell pointer-events-none">
          <div className="site-header-alert pointer-events-auto">
            <p className="text-sm text-red-600">{authError}</p>
          </div>
        </div>
      )}

      <div
        className={`mobile-nav ${isMenuOpen ? 'is-open' : ''} ${isNovaRoute ? 'mobile-nav--nova' : ''}`}
        id="mobile-nav-overlay"
        hidden={!isMenuVisible}
        onClick={handleOverlayClick}
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-nav__panel" role="dialog" aria-modal="true" aria-label="Мобильная навигация">
          <button className="mobile-nav__close" type="button" aria-label="Закрыть меню" onClick={closeMenu}>
            ✕
          </button>

          <nav className="mobile-nav__primary" aria-label="Основные разделы">
            {PRIMARY_NAV_ITEMS.map((item, index) => {
              const isActive = isItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={index === 0 ? firstMobileLinkRef : undefined}
                  className={`mobile-nav__primary-link ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav className="mobile-nav__secondary" aria-label="Дополнительные разделы">
            {SECONDARY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav__secondary-link ${item.href === '/donate' ? 'mobile-nav__secondary-link--accent' : ''}`}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}

            {!user ? (
              <button
                type="button"
                className="mobile-nav__secondary-button"
                onClick={() => {
                  closeMenu();
                  openAuthModal();
                }}
              >
                Войти
              </button>
            ) : (
              <>
                <Link href="/account" className="mobile-nav__secondary-link" onClick={closeMenu}>
                  Кабинет
                </Link>
                <button type="button" className="mobile-nav__secondary-button" onClick={() => void handleLogout()}>
                  Выйти
                </button>
              </>
            )}

            <ThemeToggle className="mobile-nav__theme-toggle" />
          </nav>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={closeAuthModal}
        intent={authIntent}
        onIntentHandled={handleIntentHandled}
      />
    </>
  );
};
