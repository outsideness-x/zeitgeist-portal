import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer data-cursor-dark className="relative overflow-hidden border-t border-[color:var(--line-soft)] bg-[#17110f] text-[#f2e8de] dark:bg-[color:var(--color-canvas)] dark:text-[color:var(--foreground)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(141,67,57,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_28%)]" />
      <div className="page-shell relative py-16 sm:py-20">
        <div className="max-w-[44rem]">
          <div className="grid items-start gap-10 sm:grid-cols-[minmax(0,18rem)_minmax(0,18rem)] sm:justify-start sm:gap-x-20 sm:gap-y-12 lg:grid-cols-[minmax(0,19rem)_minmax(0,19rem)] lg:gap-x-24">
            <div className="min-w-0">
              <h4 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#d08d82] dark:text-accent">Разделы</h4>
              <ul className="mt-6 space-y-3 font-serif text-[1.02rem] text-[#efe4da] dark:text-[color:var(--ink-soft)]">
                <li><Link href="/research" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Каталог исследований</Link></li>
                <li><Link href="/journal" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Журнал</Link></li>
                <li><Link href="/library" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Цифровая библиотека</Link></li>
                <li><Link href="/nova-express" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Nova Express</Link></li>
              </ul>
            </div>

            <div className="min-w-0">
              <h4 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#d08d82] dark:text-accent">Организация</h4>
              <ul className="mt-6 space-y-3 font-serif text-[1.02rem] text-[#efe4da] dark:text-[color:var(--ink-soft)]">
                <li><Link href="/team" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Наша команда</Link></li>
                <li><Link href="/upload" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Отправить рукопись</Link></li>
                <li><Link href="/donate" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Поддержать нас</Link></li>
                <li><Link href="/contact" className="hover:text-white dark:hover:text-[color:var(--foreground)]">Контакты</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 font-sans text-[0.76rem] uppercase tracking-[0.14em] text-[#b29b8b] dark:text-[color:var(--muted)]">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="space-y-4">
              <p>&copy; {new Date().getFullYear()} Проект Zeitgeist. Все права защищены.</p>
              <p>DESIGNED BY CHEMICAL PINK</p>
            </div>
            <div className="flex flex-wrap gap-4 md:justify-end">
              <Link href="/privacy" className="hover:text-[#efe4da] dark:hover:text-[color:var(--foreground)]">Политика конфиденциальности</Link>
              <Link href="/terms" className="hover:text-[#efe4da] dark:hover:text-[color:var(--foreground)]">Условия использования</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
