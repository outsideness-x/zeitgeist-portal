import React from 'react';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';

export const metadata: Metadata = {
  title: 'Поддержка | Zeitgeist',
  description: 'Поддержите сохранение востоковедческих исследований и архивов.',
};

export default function DonatePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl mb-4 text-ink dark:text-gray-100">Поддержите Zeitgeist</h1>
        <p className="font-serif text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Раздел пожертвований находится в доработке.
        </p>
      </div>

      <EmptyState
        title="страница донатов скоро будет доступна"
        description="мы настраиваем безопасный и удобный процесс поддержки проекта."
      />
    </div>
  );
}
