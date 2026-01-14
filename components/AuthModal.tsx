"use client";

import React, { useState } from 'react';
import { AuthMode } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    
    // Mock success
    const username = name || email.split('@')[0];
    onLoginSuccess(username);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-paper w-full max-w-md p-8 shadow-2xl border border-sepia">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-accent"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="font-display text-3xl text-center mb-2">
          {mode === AuthMode.LOGIN ? 'Welcome Back' : 'Join Zeitgeist'}
        </h2>
        <p className="text-center font-serif text-gray-500 italic mb-8">
          {mode === AuthMode.LOGIN ? 'Access your research library' : 'Start your journey into the archives'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === AuthMode.REGISTER && (
            <div>
              <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1 text-gray-500">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-300 px-4 py-2 focus:outline-none focus:border-accent font-serif"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1 text-gray-500">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 px-4 py-2 focus:outline-none focus:border-accent font-serif"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1 text-gray-500">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-gray-300 px-4 py-2 focus:outline-none focus:border-accent font-serif"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent text-white py-3 font-sans uppercase tracking-widest text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (mode === AuthMode.LOGIN ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
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