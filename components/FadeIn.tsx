'use client';

import { useEffect, useState, type ReactNode } from 'react';

type FadeInProps = {
  children: ReactNode;
  className?: string;
};

export function FadeIn({ children, className = '' }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}
