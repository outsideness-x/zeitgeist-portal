import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | Zeitgeist',
  description: 'Политика конфиденциальности исследовательского портала Zeitgeist.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl text-ink dark:text-gray-100">Политика конфиденциальности</h1>
      <div className="prose mt-8 font-serif prose-stone dark:prose-invert">
        <p>Мы собираем только минимальный объем данных, необходимый для работы портала.</p>
        <p>
          Данные авторизации и отправленные рукописи используются только для редакционных
          процессов и не передаются третьим лицам.
        </p>
        <p>
          По вопросам конфиденциальности пишите на <a href="mailto:contact@zeitgeist-project.org">contact@zeitgeist-project.org</a>.
        </p>
      </div>
    </div>
  );
}
