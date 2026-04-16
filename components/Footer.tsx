import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer" aria-label="Подвал сайта">
      <div className="site-footer__grid">
        <section className="site-footer__col" aria-labelledby="site-footer-sections">
          <h2 id="site-footer-sections">Разделы</h2>
          <Link href="/journal">Журнал</Link>
          <Link href="/research">Исследования</Link>
          <Link href="/nova-express">Nova Express</Link>
          <Link href="/courses">Курсы</Link>
          <Link href="/products">Товары</Link>
          <Link href="/team">Команда</Link>
          <span className="site-footer__link site-footer__link--muted" aria-disabled="true">Библиотека (скоро)</span>
        </section>

        <section className="site-footer__col" aria-labelledby="site-footer-resources">
          <h2 id="site-footer-resources">Ресурсы</h2>
          <Link href="/upload">Отправить рукопись</Link>
          <Link href="/contact">Контакты</Link>
          <Link href="/account">Личный кабинет</Link>
        </section>

        <section className="site-footer__col" aria-labelledby="site-footer-org">
          <h2 id="site-footer-org">Организация</h2>
          <Link href="/team">Наша команда</Link>
          <Link href="/donate">Поддержать проект</Link>
          <Link href="/contact">Связаться с редакцией</Link>
        </section>
      </div>

      <div className="site-footer__bottom">
        <div className="site-footer__legal-left">© 2026 Zeitgeist. Все права защищены.</div>
        <div className="site-footer__legal-right">
          <Link href="/privacy">Политика конфиденциальности</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">Условия использования</Link>
          <span aria-hidden="true">·</span>
          <span>DESIGNED BY CHEMICAL PINK</span>
        </div>
      </div>
    </footer>
  );
};
