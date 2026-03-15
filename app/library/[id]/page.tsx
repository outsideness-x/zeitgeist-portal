import { fetchBookById } from '@/services/content';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentImage } from '@/components/ContentImage';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const book = await fetchBookById(id);

  if (!book) return { title: 'Книга не найдена' };

  return {
    title: `${book.title} | Библиотека Zeitgeist`,
    description: book.description,
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params;
  const book = await fetchBookById(id);

  if (!book) {
    notFound();
  }

  const hasValidPdf = Boolean(book.pdfUrl && book.pdfUrl !== '#');

  return (
    <div className="min-h-screen bg-paper dark:bg-card-bg py-20 px-4 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        
        {/* back link */}
        <div className="mb-8">
          <Link href="/library" className="text-xs font-sans font-bold uppercase tracking-widest text-gray-500 hover:text-accent transition-colors">
            &larr; Назад к библиотеке
          </Link>
        </div>

        <div className="bg-white dark:bg-card-bg border border-sepia dark:border-gray-800 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col md:flex-row gap-12">
            
            {/* left column: cover */}
            <div className="w-full md:w-1/3 flex-shrink-0">
              <div className="aspect-[2/3] w-full bg-gray-100 dark:bg-card-bg shadow-md border border-gray-200 dark:border-gray-700 p-2">
                <ContentImage
                  src={book.coverImage}
                  alt={book.title}
                  route="/library"
                  component="LibraryBookDetail"
                  articleId={book.id}
                  width={500}
                  height={750}
                  fill={false}
                  className="h-full w-full object-cover"
                  fallbackLabel="обложка недоступна"
                />
              </div>
            </div>

            {/* right column: details */}
            <div className="flex-grow">
              <div className="mb-6 border-b border-gray-100 dark:border-gray-700 pb-6">
                <h1 className="font-display text-4xl md:text-5xl mb-4 text-ink dark:text-gray-100 leading-tight">
                  {book.title}
                </h1>
                <p className="font-serif text-2xl text-gray-500 dark:text-gray-400 italic">
                  автор: {book.author}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 text-sm font-sans">
                <div>
                  <span className="block text-gray-400 uppercase tracking-wider text-xs mb-1">Год издания</span>
                  <span className="text-ink dark:text-gray-300">{book.publishedYear}</span>
                </div>
                <div>
                  <span className="block text-gray-400 uppercase tracking-wider text-xs mb-1">Язык</span>
                  <span className="text-ink dark:text-gray-300">{book.language}</span>
                </div>
              </div>

              <div className="prose prose-stone dark:prose-invert font-serif mb-10 text-gray-700 dark:text-gray-300 leading-relaxed">
                <p>{book.longDescription}</p>
              </div>

              {/* download action */}
              <div className="bg-stone-50 dark:bg-card-bg p-6 border border-sepia dark:border-gray-700">
                <h4 className="font-sans font-bold uppercase text-sm mb-4 text-ink dark:text-gray-200">Цифровой доступ</h4>
                {hasValidPdf ? (
                  <a
                    href={book.pdfUrl}
                    download
                    className="inline-flex items-center justify-center w-full md:w-auto px-8 py-3 bg-accent text-white font-sans uppercase text-sm tracking-widest hover:bg-black dark:hover:bg-gray-700 transition-colors"
                  >
                    Скачать PDF
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center w-full md:w-auto px-8 py-3 bg-gray-400 text-white font-sans uppercase text-sm tracking-widest cursor-not-allowed"
                  >
                    PDF недоступен
                  </button>
                )}
                <p className="mt-3 text-xs text-gray-400 text-center md:text-left">
                  {hasValidPdf
                    ? 'Только для академических и исследовательских целей.'
                    : 'Цифровая копия скоро появится. Пожалуйста, зайдите позже.'}
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
