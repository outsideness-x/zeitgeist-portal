import type { JSX } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
};

export const EmptyState = ({ title, description, className }: EmptyStateProps): JSX.Element => {
  return (
    <div className={`site-panel rounded-[1.75rem] px-6 py-8 text-center sm:px-8 sm:py-10 ${className ?? ''}`}>
      <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-accent">coming soon</p>
      <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[0.96] tracking-[-0.04em] text-ink dark:text-gray-100">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl font-serif text-[1.02rem] leading-relaxed text-[color:var(--muted)] dark:text-gray-400">{description}</p>
    </div>
  );
};
