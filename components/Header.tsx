"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthModal } from './AuthModal';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<{name: string} | null>(null); // Mock auth state

  const isActive = (path: string) => pathname === path ? "text-accent border-b border-accent" : "text-ink hover:text-accent transition-colors";

  const handleLoginSuccess = (username: string) => {
    setUser({ name: username });
    setAuthOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-sepia shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-display text-3xl tracking-widest text-ink hover:text-accent transition-colors">
                ZEITGEIST
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8 items-center font-serif text-lg tracking-wide">
              <Link href="/research" className={isActive('/research')}>Research</Link>
              <Link href="/journal" className={isActive('/journal')}>Journal</Link>
              <Link href="/donate" className={isActive('/donate')}>Donate</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/upload" 
                className="hidden md:inline-flex items-center px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-white transition-all font-sans text-sm uppercase tracking-wider duration-300"
              >
                Upload Paper
              </Link>
              
              {user ? (
                <div className="flex items-center space-x-2 font-sans text-sm">
                   <div className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center font-bold">
                      {user.name.charAt(0)}
                   </div>
                   <button onClick={() => setUser(null)} className="text-gray-500 hover:text-red-500 text-xs uppercase">Logout</button>
                </div>
              ) : (
                <button 
                  onClick={() => setAuthOpen(true)}
                  className="text-ink font-serif italic hover:text-accent transition-colors"
                >
                  Log In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setAuthOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};