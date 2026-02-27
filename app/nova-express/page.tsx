import { fetchArticles } from '@/services/content';
import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { ContentImage } from '@/components/ContentImage';
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

        {/* Cyber Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.items.length > 0 ? (
            articles.items.map(article => (
              <article key={article.id} className="group relative rounded-lg bg-paper dark:bg-card-bg border-2 border-ink dark:border-gray-700 hover:border-accent dark:hover:border-green-500 transition-colors duration-300 p-6">
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink dark:border-gray-600 group-hover:border-accent dark:group-hover:border-green-500 transition-colors"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink dark:border-gray-600 group-hover:border-accent dark:group-hover:border-green-500 transition-colors"></div>

                <Link href={`/article/${article.id}`} className="mb-5 block">
                  <div className="relative aspect-[16/10] overflow-hidden rounded border border-ink dark:border-gray-700 bg-sepia">
                    <ContentImage
                      src={article.feature_image}
                      alt={article.title}
                      route="/nova-express"
                      component="NovaCard"
                      articleId={article.id}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      fallbackLabel="no preview image"
                    />
                  </div>
                </Link>

                <div className="mb-4 flex items-start justify-between gap-3">
                  <span
                    className="inline-block max-w-[72%] truncate text-xs font-bold bg-ink text-paper dark:bg-gray-800 dark:text-gray-200 px-2 py-1"
                    title={`ID_ФАЙЛА: ${article.id.toUpperCase()}`}
                  >
                    ID_ФАЙЛА: {article.id.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(article.published_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-2xl font-bold leading-tight mb-4 group-hover:text-accent dark:group-hover:text-green-400 transition-colors break-words line-clamp-4">
                  <Link href={`/article/${article.id}`}>
                    {article.title}
                  </Link>
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 border-l-2 border-gray-300 dark:border-gray-700 pl-4 break-words">
                  {article.excerpt}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {article.tags.map(tag => (
                    <span key={tag} className="text-[10px] uppercase border border-gray-400 dark:border-gray-600 px-1 text-gray-500 dark:text-gray-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>
            ))
          ) : collectionState === 'error' ? (
            <div className="md:col-span-2 lg:col-span-3">
              <EmptyState
                title="nova express временно недоступен"
                description="ghost api вернул ошибку. лента восстановится автоматически после успешного запроса."
              />
            </div>
          ) : (
            <div className="md:col-span-2 lg:col-span-3">
              <EmptyState
                title="nova express готовится"
                description="поток материалов появится после публикации в ghost."
              />
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between">
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
