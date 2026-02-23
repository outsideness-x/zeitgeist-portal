import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Поддержка | Zeitgeist',
  description: 'Поддержите проект Zeitgeist переводом по QR или номеру карты.',
};

export default function DonatePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-5xl text-ink dark:text-gray-100">Поддержать нас</h1>
        <p className="mt-4 font-serif text-lg text-gray-600 dark:text-gray-300">
          Можно перевести поддержку по QR-коду или по номеру карты.
        </p>
      </div>

      <section className="relative mx-auto mt-10 max-w-3xl overflow-hidden border border-sepia bg-white/90 p-6 shadow-lg transition-colors dark:border-gray-700 dark:bg-card-bg sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sepia/50 via-transparent to-transparent dark:from-gray-800/40" />

        <div className="relative grid gap-8 md:grid-cols-[minmax(0,340px)_1fr] md:items-center">
          <div className="mx-auto w-full max-w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-black/50">
            <Image
              src="/donate/ozon-bank-qr.png"
              alt="QR-код для перевода в Озон-Банк"
              width={600}
              height={600}
              className="h-auto w-full rounded-lg"
              priority
            />
          </div>

          <div className="space-y-5 text-center md:text-left">
            <p className="font-sans text-xs uppercase tracking-widest text-accent">Поддержка проекта</p>
            <h2 className="font-display text-3xl text-ink dark:text-gray-100">Перевод для Zeitgeist</h2>

            <div className="rounded-lg border border-sepia bg-paper/80 px-4 py-4 dark:border-gray-700 dark:bg-black/40">
              <p className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Номер карты
              </p>
              <p className="mt-2 select-all font-mono text-lg tracking-[0.2em] text-ink dark:text-gray-100 sm:text-2xl">
                2204 3206 3369 2324
              </p>
            </div>

            <p className="font-serif text-base text-gray-700 dark:text-gray-300">
              Банк получателя: <span className="font-semibold text-ink dark:text-gray-100">Озон-Банк</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
