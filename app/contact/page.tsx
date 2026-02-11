import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Zeitgeist',
  description: 'Contact the Zeitgeist research and archives team.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl text-ink dark:text-gray-100">Contact</h1>
      <p className="mt-4 font-serif text-lg text-gray-600 dark:text-gray-300">
        For project inquiries, editorial correspondence, and archive access requests:
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
