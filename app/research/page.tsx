import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/EmptyState';
import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveCollectionVisualState } from '@/services/content/renderPolicy';

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
  const collectionState = resolveCollectionVisualState({
    itemsCount: papers.items.length,
    fetchMeta: papers.fetchMeta,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl mb-4">Каталог исследований</h1>
        <p className="font-serif text-xl text-gray-500">Рецензируемые статьи, архивные находки и академические материалы.</p>
      </div>

      <div className="space-y-12">
        {papers.items.length > 0 ? (
          papers.items.map((paper, idx) => (
            <div key={paper.id} className={idx !== papers.items.length - 1 ? "border-b border-gray-200 pb-12" : ""}>
              <ArticleCard article={paper} featured={true} routePath="/research" />
            </div>
          ))
        ) : collectionState === 'error' ? (
          <EmptyState
            title="каталог исследований временно недоступен"
            description="сбой при запросе к ghost. уже опубликованные материалы вернутся без ручных действий после восстановления API."
          />
        ) : (
          <EmptyState
            title="каталог исследований готовится"
            description="материалы появятся после публикации в ghost."
          />
        )}
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
