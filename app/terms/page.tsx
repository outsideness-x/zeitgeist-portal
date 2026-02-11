import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | Zeitgeist',
  description: 'Terms of use for accessing Zeitgeist content and archives.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl text-ink dark:text-gray-100">Terms of Use</h1>
      <div className="prose mt-8 font-serif prose-stone dark:prose-invert">
        <p>All published archive materials are provided for educational and research use.</p>
        <p>
          Redistribution rights vary by source; users are responsible for respecting copyright
          and citation requirements.
        </p>
        <p>Platform features and access policies may evolve as the archive expands.</p>
      </div>
    </div>
  );
}
