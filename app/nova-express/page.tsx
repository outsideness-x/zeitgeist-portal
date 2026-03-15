import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { resolveCollectionVisualState } from '@/services/content/renderPolicy';

export const metadata: Metadata = {
  title: 'Nova Express | Zeitgeist',
  description: 'Кибернетика, кат-ап и электронная революция.',
};

type NovaExpressPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function NovaExpressPage({ searchParams }: NovaExpressPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number(resolvedSearchParams?.page ?? '1') || 1);
  const articles = await fetchArticles('nova', { page, pageSize: 9 });
  const collectionState = resolveCollectionVisualState({
    itemsCount: articles.items.length,
    fetchMeta: articles.fetchMeta,
  });

  return (
    <div className="min-h-screen relative overflow-hidden font-mono">
      {/* Scanlines Overlay */}
      <div className="absolute inset-0 scanlines z-0 opacity-30 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        
        {/* Glitch Header */}
        <div className="text-center mb-20">
          <h1 
            className="glitch-text text-6xl md:text-8xl font-bold uppercase tracking-tighter mb-4" 
            data-text="NOVA EXPRESS"
          >
            Nova Express
          </h1>
          <div className="inline-block border border-ink dark:border-gray-600 p-2 mt-4">
            <p className="text-sm md:text-base uppercase tracking-widest">
              {"///"} SYSTEM STATUS: <span className="text-green-600 dark:text-green-400 font-bold animate-pulse">ERROR</span> {"///"}
            </p>
          </div>
          <p className="mt-6 max-w-xl mx-auto text-gray-500 dark:text-gray-400">
            &quot;Мягкая машина — это биологическая единица.&quot; <br/>
            Декодируем систему контроля через кат-ап и кибернетику.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {articles.items.length > 0 ? (
            articles.items.map((article, idx) => (
              <div key={article.id} className={idx !== articles.items.length - 1 ? "border-b border-gray-200 pb-12 dark:border-gray-800" : ""}>
                <ArticleCard article={article} featured={true} routePath="/nova-express" />
              </div>
            ))
          ) : collectionState === 'error' ? (
            <EmptyState
              title="nova express временно недоступен"
              description="ghost api вернул ошибку. лента восстановится автоматически после успешного запроса."
            />
          ) : (
            <EmptyState
              title="nova express готовится"
              description="поток материалов появится после публикации в ghost."
            />
          )}
        </div>

        <div className="mt-12 max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={page > 1 ? `/nova-express?page=${page - 1}` : '#'}
            aria-disabled={page <= 1}
            className={`px-4 py-2 border border-sepia text-sm uppercase tracking-wider ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-accent'}`}
          >
            Назад
          </Link>
          <span className="text-sm text-gray-500">
            Страница {articles.page} из {articles.totalPages}
          </span>
          <Link
            href={page < articles.totalPages ? `/nova-express?page=${page + 1}` : '#'}
            aria-disabled={page >= articles.totalPages}
            className={`px-4 py-2 border border-sepia text-sm uppercase tracking-wider ${page >= articles.totalPages ? 'pointer-events-none opacity-40' : 'hover:border-accent'}`}
          >
            Вперед
          </Link>
        </div>
      </div>
    </div>
  );
}
