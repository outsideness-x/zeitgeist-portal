import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Поддержка | Zeitgeist',
  description: 'Поддержите сохранение востоковедческих исследований и архивов.',
};

export default function DonatePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-5xl mb-6">Поддержите Zeitgeist</h1>
      <p className="font-serif text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        Ваши пожертвования помогают оцифровывать редкие рукописи, поддерживать исследователей и сохранять платформу без рекламы.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[10, 50, 100].map((amount) => (
          <button key={amount} className="group relative p-8 bg-white border border-sepia hover:border-accent transition-all">
            <h3 className="font-display text-4xl mb-2 text-ink group-hover:text-accent">${amount}</h3>
            <p className="font-sans text-xs uppercase tracking-widest text-gray-500">Разово</p>
          </button>
        ))}
      </div>

      <div className="bg-sepia/30 p-10 border border-sepia">
        <h2 className="font-display text-3xl mb-4">Книжный магазин</h2>
        <p className="font-serif mb-6">Доход от нашей кураторской коллекции также поддерживает миссию проекта.</p>
        <button className="px-8 py-3 bg-white border border-ink text-ink font-sans uppercase text-sm hover:bg-ink hover:text-white transition-colors">
          Смотреть коллекцию (скоро)
        </button>
      </div>
    </div>
  );
}
