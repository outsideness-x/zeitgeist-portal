import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="relative overflow-hidden border-t border-[color:var(--line-soft)] bg-[#17110f] text-[#f2e8de]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(141,67,57,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)]" />
      <div className="page-shell relative py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 sm:grid-cols-2 sm:gap-12 lg:gap-20">
            <div className="min-w-0">
              <h4 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#d08d82]">Разделы</h4>
              <ul className="mt-6 space-y-3 font-serif text-[1.02rem] text-[#efe4da]">
                <li><Link href="/research" className="hover:text-white">Каталог исследований</Link></li>
                <li><Link href="/journal" className="hover:text-white">Журнал</Link></li>
                <li><Link href="/library" className="hover:text-white">Цифровая библиотека</Link></li>
                <li><Link href="/nova-express" className="hover:text-white">Nova Express</Link></li>
              </ul>
            </div>

            <div className="min-w-0">
              <h4 className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#d08d82]">Организация</h4>
              <ul className="mt-6 space-y-3 font-serif text-[1.02rem] text-[#efe4da]">
                <li><Link href="/team" className="hover:text-white">Наша команда</Link></li>
                <li><Link href="/upload" className="hover:text-white">Отправить рукопись</Link></li>
                <li><Link href="/donate" className="hover:text-white">Поддержать нас</Link></li>
                <li><Link href="/contact" className="hover:text-white">Контакты</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 font-sans text-[0.76rem] uppercase tracking-[0.14em] text-[#b29b8b] md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Проект Zeitgeist. Все права защищены.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-[#efe4da]">Политика конфиденциальности</Link>
            <Link href="/terms" className="hover:text-[#efe4da]">Условия использования</Link>
          </div>
        </div>
        <p className="mt-4 text-left font-sans text-[0.76rem] uppercase tracking-[0.14em] text-[#b29b8b]">
          DESIGNED BY CHEMICAL PINK
        </p>
      </div>
    </footer>
  );
};
