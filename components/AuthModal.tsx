"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AuthMode } from '@/types';
import { buildAuthCallbackPath } from '@/services/auth/oauth';
import { type AuthTwoFactorChallenge, type AuthTwoFactorStatus, useAuth } from './AuthProvider';

type AuthModalStep = 'credentials' | 'two-factor';

export type AuthModalIntent = {
  id: number;
  type: 'oauth-error';
  message?: string;
} | {
  id: number;
  type: 'two-factor';
  debugCode?: string;
} | null;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent?: AuthModalIntent;
  onIntentHandled?: (id: number) => void;
}

const EyeIcon = () => {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3.3" />
    </svg>
  );
};

const EyeOffIcon = () => {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A3.4 3.4 0 0 0 9 12a3 3 0 0 0 4.5 2.6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.62 6.62C4.82 7.92 3.48 10 2.25 12c3.75 7.5 9.75 7.5 9.75 7.5a10.96 10.96 0 0 0 3.82-.7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.75 5.05A10.4 10.4 0 0 1 21.75 12c-.7 1.42-1.45 2.64-2.3 3.66" />
    </svg>
  );
};

const resolveTwoFactorTitle = (challenge: AuthTwoFactorChallenge | null): string => {
  if (!challenge) {
    return 'Подтверждение входа';
  }

  if (challenge.purpose === 'link_google') {
    return 'Подтвердите привязку Google';
  }

  return 'Подтверждение входа';
};

const resolveTwoFactorHint = (challenge: AuthTwoFactorChallenge | null): string => {
  if (!challenge) {
    return 'Введите код из письма, чтобы продолжить.';
  }

  if (challenge.purpose === 'link_google') {
    return `Мы отправили код на ${challenge.emailHint}. Это подтверждает безопасную привязку Google к существующему аккаунту.`;
  }

  return `Мы отправили код на ${challenge.emailHint}.`;
};

const extractMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Ошибка авторизации';
};

const toTwoFactorChallenge = (status: Exclude<AuthTwoFactorStatus, { required: false }>): AuthTwoFactorChallenge => {
  return {
    purpose: status.purpose,
    expiresAt: status.expiresAt,
    resendAvailableAt: status.resendAvailableAt,
    emailHint: status.emailHint,
  };
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, intent = null, onIntentHandled }) => {
  const {
    login,
    register,
    getLoginTwoFactorStatus,
    sendLoginTwoFactorCode,
    verifyLoginTwoFactorCode,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [step, setStep] = useState<AuthModalStep>('credentials');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<AuthTwoFactorChallenge | null>(null);

  const [loading, setLoading] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());

  const emailInputRef = useRef<HTMLInputElement>(null);
  const twoFactorInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  const nameInputId = useId();
  const emailInputId = useId();
  const passwordInputId = useId();
  const twoFactorCodeInputId = useId();

  const resetModalState = useCallback(() => {
    setMode(AuthMode.LOGIN);
    setStep('credentials');
    setPassword('');
    setEmail('');
    setName('');
    setShowPassword(false);
    setTwoFactorCode('');
    setTwoFactorChallenge(null);
    setLoading(false);
    setTwoFactorBusy(false);
    setErrorMessage('');
  }, []);

  const handleClose = useCallback(() => {
    resetModalState();
    onClose();
  }, [onClose, resetModalState]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    window.requestAnimationFrame(() => {
      if (step === 'two-factor') {
        twoFactorInputRef.current?.focus();
        return;
      }
      emailInputRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, isOpen, step]);

  useEffect(() => {
    if (!isOpen || !intent) {
      return;
    }

    onIntentHandled?.(intent.id);
    setErrorMessage('');

    if (intent.type === 'oauth-error') {
      setMode(AuthMode.LOGIN);
      setStep('credentials');
      setTwoFactorChallenge(null);
      setTwoFactorCode('');
      setErrorMessage(intent.message ?? 'Не удалось завершить авторизацию.');
      return;
    }

    let cancelled = false;

    const loadTwoFactorStatus = async () => {
      setMode(AuthMode.LOGIN);
      setStep('two-factor');
      setTwoFactorBusy(true);
      setTwoFactorCode('');
      setTwoFactorChallenge(null);

      try {
        const status = await getLoginTwoFactorStatus();
        if (!status.required) {
          if (!cancelled) {
            setStep('credentials');
            setErrorMessage('Срок действия проверки истек. Войдите снова.');
          }
          return;
        }

        if (!cancelled) {
          const challengeFromStatus = toTwoFactorChallenge(status);
          setTwoFactorChallenge({
            ...challengeFromStatus,
            ...(intent.debugCode ? { debugCode: intent.debugCode } : {}),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStep('credentials');
          setErrorMessage(extractMessage(error));
        }
      } finally {
        if (!cancelled) {
          setTwoFactorBusy(false);
        }
      }
    };

    void loadTwoFactorStatus();

    return () => {
      cancelled = true;
    };
  }, [getLoginTwoFactorStatus, intent, isOpen, onIntentHandled]);

  useEffect(() => {
    if (!isOpen || step !== 'two-factor') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen, step]);

  const resendCooldownSeconds = useMemo(() => {
    if (!twoFactorChallenge?.resendAvailableAt) {
      return 0;
    }

    const availableAt = Date.parse(twoFactorChallenge.resendAvailableAt);
    if (!Number.isFinite(availableAt)) {
      return 0;
    }

    return Math.max(0, Math.ceil((availableAt - nowMs) / 1000));
  }, [nowMs, twoFactorChallenge?.resendAvailableAt]);

  const handleCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (mode === AuthMode.LOGIN) {
        const callbackPath = buildAuthCallbackPath(window.location.pathname, window.location.search);
        const result = await login(email, password, callbackPath);

        if (result.status === 'two-factor-required') {
          setStep('two-factor');
          setTwoFactorChallenge(result.challenge);
          setTwoFactorCode('');
          return;
        }
      } else {
        await register(name, email, password);
      }

      handleClose();
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setTwoFactorBusy(true);
    setErrorMessage('');

    try {
      await verifyLoginTwoFactorCode(twoFactorCode);
      handleClose();
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const handleTwoFactorResend = async () => {
    setTwoFactorBusy(true);
    setErrorMessage('');

    try {
      const challenge = await sendLoginTwoFactorCode();
      setTwoFactorChallenge(challenge);
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const isSubmitting = loading;
  const showTwoFactorView = step === 'two-factor';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Закрыть окно авторизации"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="relative w-full max-w-md rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-6 text-ink shadow-[var(--shadow-card)] sm:p-8"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-[color:var(--muted)] transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Закрыть окно авторизации"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id={titleId} className="mb-2 text-center font-display text-[clamp(2rem,5vw,2.6rem)] leading-[0.98] tracking-[-0.03em]">
          {showTwoFactorView
            ? resolveTwoFactorTitle(twoFactorChallenge)
            : mode === AuthMode.LOGIN ? 'С возвращением' : 'Присоединиться к Zeitgeist'}
        </h2>
        <p id={subtitleId} className="mb-8 text-center font-serif text-[0.98rem] leading-relaxed text-[color:var(--muted)]">
          {showTwoFactorView
            ? resolveTwoFactorHint(twoFactorChallenge)
            : mode === AuthMode.LOGIN ? 'Войдите в свою исследовательскую библиотеку' : 'Начните ваше путешествие по архивам'}
        </p>

        {!showTwoFactorView ? (
          <>
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {mode === AuthMode.REGISTER && (
                <div>
                  <label htmlFor={nameInputId} className="mb-1 block text-xs font-sans font-bold uppercase tracking-wider text-[color:var(--muted)]">Полное имя</label>
                  <input
                    id={nameInputId}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 font-serif text-ink outline-none transition-colors focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                    autoComplete="name"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor={emailInputId} className="mb-1 block text-xs font-sans font-bold uppercase tracking-wider text-[color:var(--muted)]">Эл. почта</label>
                <input
                  ref={emailInputRef}
                  id={emailInputId}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 font-serif text-ink outline-none transition-colors focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                  autoComplete="email"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label htmlFor={passwordInputId} className="mb-1 block text-xs font-sans font-bold uppercase tracking-wider text-[color:var(--muted)]">Пароль</label>
                <div className="relative">
                  <input
                    id={passwordInputId}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 pr-12 font-serif text-ink outline-none transition-colors focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                    autoComplete={mode === AuthMode.LOGIN ? 'current-password' : 'new-password'}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    aria-pressed={showPassword}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-50 dark:hover:bg-gray-700"
              >
                {loading ? 'Обработка...' : mode === AuthMode.LOGIN ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === AuthMode.LOGIN ? AuthMode.REGISTER : AuthMode.LOGIN)}
                className="text-sm font-sans text-[color:var(--muted)] underline underline-offset-4 transition-colors hover:text-accent"
                disabled={isSubmitting}
              >
                {mode === AuthMode.LOGIN ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleTwoFactorVerify} className="space-y-4">
            <div>
              <label htmlFor={twoFactorCodeInputId} className="mb-1 block text-xs font-sans font-bold uppercase tracking-wider text-[color:var(--muted)]">Код подтверждения</label>
              <input
                ref={twoFactorInputRef}
                id={twoFactorCodeInputId}
                type="text"
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 font-sans text-lg tracking-[0.3em] text-ink outline-none transition-colors focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                disabled={twoFactorBusy}
                required
              />
            </div>

            {twoFactorChallenge?.debugCode && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Тестовый код: <span className="font-semibold">{twoFactorChallenge.debugCode}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={twoFactorBusy || twoFactorCode.length !== 6}
              className="w-full bg-accent py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-50 dark:hover:bg-gray-700"
            >
              {twoFactorBusy ? 'Проверяем...' : 'Подтвердить вход'}
            </button>

            <button
              type="button"
              onClick={() => void handleTwoFactorResend()}
              disabled={twoFactorBusy || resendCooldownSeconds > 0}
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted-strong)] transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendCooldownSeconds > 0
                ? `Отправить код повторно через ${resendCooldownSeconds}с`
                : 'Отправить код повторно'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setTwoFactorChallenge(null);
                setTwoFactorCode('');
                setErrorMessage('');
              }}
              disabled={twoFactorBusy}
              className="w-full text-sm font-sans text-[color:var(--muted)] underline underline-offset-4 transition-colors hover:text-accent"
            >
              Вернуться ко входу
            </button>
          </form>
        )}

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600" role="alert">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};
