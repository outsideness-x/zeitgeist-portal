import { fetchLibraryBooks } from '@/services/content';
import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { ContentImage } from '@/components/ContentImage';

export const metadata: Metadata = {
  title: 'Цифровая библиотека | Zeitgeist',
  description: 'Кураторская коллекция текстов и рукописей.',
};

export default async function LibraryPage() {
  const books = await fetchLibraryBooks();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="border-b border-sepia dark:border-gray-800 pb-8 mb-12">
        <h1 className="font-display text-5xl mb-2 text-ink dark:text-gray-100">Цифровая библиотека</h1>
        <p className="font-serif text-xl text-gray-500 dark:text-gray-400 italic">
          Архивная коллекция PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {books.length > 0 ? (
          books.map((book) => (
            <Link href={`/library/${book.id}`} key={book.id} className="group block h-full">
              <div className="bg-white dark:bg-card-bg border border-sepia dark:border-gray-800 p-4 h-full transition-all duration-300 hover:shadow-lg hover:border-accent dark:hover:border-gray-600">
                <div className="aspect-[2/3] w-full bg-gray-100 dark:bg-card-bg mb-4 overflow-hidden relative">
                  <ContentImage
                    src={book.coverImage}
                    alt={book.title}
                    route="/library"
                    component="LibraryCard"
                    articleId={book.id}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    fallbackLabel="обложка недоступна"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white text-ink dark:text-black px-3 py-1 text-xs font-sans uppercase tracking-widest shadow-sm">Открыть</span>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="font-display text-lg leading-tight mb-2 text-ink dark:text-gray-200 group-hover:text-accent transition-colors">
                    {book.title}
                  </h3>
                  <p className="font-serif text-sm text-gray-500 dark:text-gray-400 italic mb-3">
                    {book.author}
                  </p>
                  <p className="font-sans text-xs text-gray-600 dark:text-gray-500 line-clamp-3 leading-relaxed">
                    {book.description}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="sm:col-span-2 lg:col-span-4">
            <EmptyState
              title="цифровая библиотека готовится"
              description="книги и pdf появятся после первой публикации."
            />
          </div>
        )}
      </div>
    </div>
  );
}
