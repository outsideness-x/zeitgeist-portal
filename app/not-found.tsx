import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-sans text-xs uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-2 font-display text-5xl text-ink dark:text-gray-100">Page not found</h1>
      <p className="mt-4 max-w-xl font-serif text-gray-600 dark:text-gray-300">
        The archive entry you requested is unavailable or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-sm border border-accent px-6 py-3 font-sans text-sm uppercase tracking-widest text-accent transition-colors hover:bg-accent hover:text-white"
      >
        Return Home
      </Link>
    </div>
  );
}
