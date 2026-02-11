import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контакты | Zeitgeist',
  description: 'Связь с командой исследователей и архивистов Zeitgeist.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl text-ink dark:text-gray-100">Контакты</h1>
      <p className="mt-4 font-serif text-lg text-gray-600 dark:text-gray-300">
        По вопросам о проекте, редакционному сотрудничеству и доступу к архиву:
      </p>
      <a
        href="mailto:contact@zeitgeist-project.org"
        className="mt-8 inline-block border border-accent px-6 py-3 font-sans text-sm uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-white"
      >
        contact@zeitgeist-project.org
      </a>
    </div>
  );
}
