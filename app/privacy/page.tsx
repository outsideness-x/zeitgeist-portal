import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Zeitgeist',
  description: 'Privacy policy for the Zeitgeist research portal.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-5xl text-ink dark:text-gray-100">Privacy Policy</h1>
      <div className="prose mt-8 font-serif prose-stone dark:prose-invert">
        <p>We collect only the minimum information needed to operate this portal.</p>
        <p>
          Authentication details and manuscript submissions are handled for editorial workflows
          only and are not sold to third parties.
        </p>
        <p>
          For privacy requests, contact <a href="mailto:contact@zeitgeist-project.org">contact@zeitgeist-project.org</a>.
        </p>
      </div>
    </div>
  );
}
