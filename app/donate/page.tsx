import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Donate | Zeitgeist',
  description: 'Support the preservation of Oriental studies and archives.',
};

export default function DonatePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-5xl mb-6">Support Zeitgeist</h1>
      <p className="font-serif text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        Your contributions help us digitize rare manuscripts, pay contemporary researchers, and keep this platform ad-free.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[10, 50, 100].map((amount) => (
          <button key={amount} className="group relative p-8 bg-white border border-sepia hover:border-accent transition-all">
            <h3 className="font-display text-4xl mb-2 text-ink group-hover:text-accent">${amount}</h3>
            <p className="font-sans text-xs uppercase tracking-widest text-gray-500">One Time</p>
          </button>
        ))}
      </div>

      <div className="bg-sepia/30 p-10 border border-sepia">
        <h2 className="font-display text-3xl mb-4">Book Shop</h2>
        <p className="font-serif mb-6">Proceeds from our curated collection also support the mission.</p>
        <button className="px-8 py-3 bg-white border border-ink text-ink font-sans uppercase text-sm hover:bg-ink hover:text-white transition-colors">
          Browse Collection (Coming Soon)
        </button>
      </div>
    </div>
  );
}