import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Каталог исследований | Zeitgeist',
  description: 'Рецензируемые статьи, архивные находки и академические материалы.',
};

type ResearchPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function ResearchPage({ searchParams }: ResearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number(resolvedSearchParams?.page ?? '1') || 1);
  const papers = await fetchArticles('research', { page, pageSize: 9 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl mb-4">Каталог исследований</h1>
        <p className="font-serif text-xl text-gray-500">Рецензируемые статьи, архивные находки и академические материалы.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {papers.items.map(paper => (
          <div key={paper.id} className="bg-white dark:bg-card-bg p-6 border border-sepia dark:border-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
             <ArticleCard article={paper} />
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between">
        <Link
          href={page > 1 ? `/research?page=${page - 1}` : '#'}
          aria-disabled={page <= 1}
          className={`px-4 py-2 border border-sepia text-sm uppercase tracking-wider ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-accent'}`}
        >
          Назад
        </Link>
        <span className="text-sm text-gray-500">
          Страница {papers.page} из {papers.totalPages}
        </span>
        <Link
          href={page < papers.totalPages ? `/research?page=${page + 1}` : '#'}
          aria-disabled={page >= papers.totalPages}
          className={`px-4 py-2 border border-sepia text-sm uppercase tracking-wider ${page >= papers.totalPages ? 'pointer-events-none opacity-40' : 'hover:border-accent'}`}
        >
          Вперед
        </Link>
      </div>
    </div>
  );
}
