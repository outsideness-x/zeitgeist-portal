import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink text-paper pt-16 pb-8 border-t-4 border-accent dark:bg-paper dark:text-gray-400 dark:border-t dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-display text-2xl mb-4 tracking-widest text-white dark:text-gray-200">ZEITGEIST</h3>
            <p className="font-serif text-gray-400 dark:text-gray-500 max-w-md text-lg leading-relaxed">
              Посвящено исследованию и сохранению востоковедческих материалов.
              Мы соединяем академические архивы и общественный интерес.
            </p>
          </div>

          <div>
            <h4 className="font-sans font-bold uppercase tracking-widest text-sm text-accent mb-6">Разделы</h4>
            <ul className="space-y-3 font-serif text-gray-300 dark:text-gray-500">
              <li><Link href="/research" className="hover:text-white dark:hover:text-gray-200 transition-colors">Каталог исследований</Link></li>
              <li><Link href="/journal" className="hover:text-white dark:hover:text-gray-200 transition-colors">Журнал</Link></li>
              <li><Link href="/library" className="hover:text-white dark:hover:text-gray-200 transition-colors">Цифровая библиотека</Link></li>
              <li><Link href="/nova-express" className="hover:text-white dark:hover:text-gray-200 transition-colors">Nova Express</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-bold uppercase tracking-widest text-sm text-accent mb-6">Организация</h4>
            <ul className="space-y-3 font-serif text-gray-300 dark:text-gray-500">
              <li><Link href="/team" className="hover:text-white dark:hover:text-gray-200 transition-colors">Наша команда</Link></li>
              <li><Link href="/upload" className="hover:text-white dark:hover:text-gray-200 transition-colors">Отправить рукопись</Link></li>
              <li><Link href="/donate" className="hover:text-white dark:hover:text-gray-200 transition-colors">Поддержать нас</Link></li>
              <li><Link href="/contact" className="hover:text-white dark:hover:text-gray-200 transition-colors">Контакты</Link></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-700 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-sans text-gray-500 dark:text-gray-600">
          <p>&copy; {new Date().getFullYear()} Проект Zeitgeist. Все права защищены.</p>
          <div className="mt-4 md:mt-0 space-x-4">
            <Link href="/privacy" className="hover:text-gray-300 dark:hover:text-gray-400">Политика конфиденциальности</Link>
            <Link href="/terms" className="hover:text-gray-300 dark:hover:text-gray-400">Условия использования</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
