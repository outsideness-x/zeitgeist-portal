"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-4xl text-ink dark:text-gray-100">Что-то пошло не так</h1>
      <p className="mt-4 max-w-xl font-serif text-gray-600 dark:text-gray-300">
        Сейчас не удалось загрузить страницу. Пожалуйста, попробуйте еще раз.
      </p>
      <p className="mt-2 text-xs text-gray-400">{error.digest ? `ID ошибки: ${error.digest}` : 'ID ошибки недоступен'}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-sm bg-accent px-6 py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-black dark:hover:bg-gray-700"
      >
        Повторить
      </button>
    </div>
  );
}
