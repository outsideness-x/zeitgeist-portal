"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { AuthMode } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const simulatedAuthDelayMs = Number(process.env.NEXT_PUBLIC_AUTH_DELAY_MS ?? 0);
  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (simulatedAuthDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, simulatedAuthDelayMs));
    }
    setLoading(false);
    
    // Mock success
    const username = name || email.split('@')[0];
    onLoginSuccess(username);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close authentication dialog"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="relative bg-paper w-full max-w-md p-8 shadow-2xl border border-sepia"
      >
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 id={titleId} className="font-display text-3xl text-center mb-2">
          {mode === AuthMode.LOGIN ? 'Welcome Back' : 'Join Zeitgeist'}
        </h2>
        <p id={subtitleId} className="text-center font-serif text-gray-500 italic mb-8">
          {mode === AuthMode.LOGIN ? 'Access your research library' : 'Start your journey into the archives'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === AuthMode.REGISTER && (
            <div>
              <label htmlFor={nameInputId} className="block text-xs font-sans font-bold uppercase tracking-wider mb-1 text-gray-500">Full Name</label>
              <input 
                id={nameInputId}
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-300 px-4 py-2 focus:outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent font-serif"
                required
              />
            </div>
          )}
          
          <div>
            <label htmlFor={emailInputId} className="block text-xs font-sans font-bold uppercase tracking-wider mb-1 text-gray-500">Email Address</label>
            <input 
              ref={emailInputRef}
              id={emailInputId}
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 px-4 py-2 focus:outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent font-serif"
              required
            />
          </div>

          <div>
            <label htmlFor={passwordInputId} className="block text-xs font-sans font-bold uppercase tracking-wider mb-1 text-gray-500">Password</label>
            <input 
              id={passwordInputId}
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-gray-300 px-4 py-2 focus:outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent font-serif"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent text-white py-3 font-sans uppercase tracking-widest text-sm hover:bg-black dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (mode === AuthMode.LOGIN ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => setMode(mode === AuthMode.LOGIN ? AuthMode.REGISTER : AuthMode.LOGIN)}
            className="text-sm font-sans text-gray-500 hover:text-accent underline underline-offset-4"
          >
            {mode === AuthMode.LOGIN ? "Don't have an account? Sign up" : "Already a member? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};
