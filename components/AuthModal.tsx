"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { AuthMode } from '@/types';
import { useAuth } from './AuthProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  const nameInputId = useId();
  const emailInputId = useId();
  const passwordInputId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    emailInputRef.current?.focus();

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetModalState = () => {
    setPassword('');
    setEmail('');
    setName('');
    setErrorMessage('');
  };

  const handleCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (mode === AuthMode.LOGIN) {
        const callbackPath = `${window.location.pathname}${window.location.search}`;
        await login(email, password, callbackPath);
      } else {
        await register(name, email, password);
      }

      resetModalState();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть окно авторизации"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="relative w-full max-w-md rounded-[1.5rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-6 text-ink shadow-[var(--shadow-card)] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[color:var(--muted)] transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 id={titleId} className="mb-2 text-center font-display text-[clamp(2rem,5vw,2.6rem)] leading-[0.98] tracking-[-0.03em]">
          {mode === AuthMode.LOGIN ? 'С возвращением' : 'Присоединиться к Zeitgeist'}
        </h2>
        <p id={subtitleId} className="mb-8 text-center font-serif text-[0.98rem] leading-relaxed text-[color:var(--muted)]">
          {mode === AuthMode.LOGIN ? 'Войдите в свою исследовательскую библиотеку' : 'Начните ваше путешествие по архивам'}
        </p>

        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          {mode === AuthMode.REGISTER && (
            <div>
              <label htmlFor={nameInputId} className="mb-1 block text-xs font-sans font-bold uppercase tracking-wider text-[color:var(--muted)]">Полное имя</label>
              <input
                id={nameInputId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 font-serif text-ink outline-none transition-colors focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 font-serif text-ink outline-none transition-colors focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
              required
            />
          </div>

          <div>
            <label htmlFor={passwordInputId} className="mb-1 block text-xs font-sans font-bold uppercase tracking-wider text-[color:var(--muted)]">Пароль</label>
            <input
              id={passwordInputId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--background)] px-4 py-3 font-serif text-ink outline-none transition-colors focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-3 font-sans uppercase tracking-widest text-sm hover:bg-black dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Обработка...' : (mode === AuthMode.LOGIN ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === AuthMode.LOGIN ? AuthMode.REGISTER : AuthMode.LOGIN)}
            className="text-sm font-sans text-[color:var(--muted)] underline underline-offset-4 transition-colors hover:text-accent"
          >
            {mode === AuthMode.LOGIN ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </button>
        </div>
      </div>
    </div>
  );
};
