import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Условия использования | Zeitgeist',
  description: 'Условия доступа к материалам и архивам Zeitgeist.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl text-ink dark:text-gray-100">Условия использования</h1>
      <div className="prose mt-8 font-serif prose-stone dark:prose-invert">
        <p>Все опубликованные архивные материалы предоставляются для обучения и исследований.</p>
        <p>
          Права на распространение зависят от источника; пользователи обязаны соблюдать
          авторские права и требования к цитированию.
        </p>
        <p>Функции платформы и правила доступа могут меняться по мере развития архива.</p>
      </div>
    </div>
  );
}
