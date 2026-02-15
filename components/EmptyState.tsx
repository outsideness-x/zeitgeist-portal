import type { JSX } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
};

export const EmptyState = ({ title, description, className }: EmptyStateProps): JSX.Element => {
  return (
    <div className={`border border-sepia bg-white p-8 text-center dark:border-gray-800 dark:bg-card-bg ${className ?? ''}`}>
      <p className="font-sans text-xs uppercase tracking-widest text-accent">coming soon</p>
      <h2 className="mt-2 font-display text-3xl text-ink dark:text-gray-100">{title}</h2>
      <p className="mt-3 font-serif text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
};
