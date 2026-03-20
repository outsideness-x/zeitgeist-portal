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
    <div className="crt-effect min-h-screen overflow-hidden bg-[#050505] text-green-500 font-mono [&_*]:font-mono">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Glitch Header */}
        <div className="text-center mb-20">
          <h1
            className="glitch-text mb-4 text-6xl font-bold uppercase tracking-tighter text-green-500 md:text-8xl"
            data-text="NOVA EXPRESS"
          >
            Nova Express
          </h1>
          <div className="mt-4 inline-block border border-green-500/70 p-2">
            <p className="text-sm uppercase tracking-widest text-green-400 md:text-base">
              {"///"} <span className="animate-pulse">SYSTEM STATUS</span>: <span className="font-bold text-green-500">ERROR</span> {"///"}
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-green-500/70">
            &quot;Мягкая машина — это биологическая единица.&quot; <br/>
            Декодируем систему контроля через кат-ап и кибернетику.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {articles.items.length > 0 ? (
            articles.items.map((article, idx) => (
              <div key={article.id} className={idx !== articles.items.length - 1 ? "border-b border-green-500/30 pb-12" : ""}>
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
            className={`border border-green-500/60 px-4 py-2 text-sm uppercase tracking-wider ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-green-400'}`}
          >
            Назад
          </Link>
          <span className="text-sm text-green-500/70">
            Страница {articles.page} из {articles.totalPages}
          </span>
          <Link
            href={page < articles.totalPages ? `/nova-express?page=${page + 1}` : '#'}
            aria-disabled={page >= articles.totalPages}
            className={`border border-green-500/60 px-4 py-2 text-sm uppercase tracking-wider ${page >= articles.totalPages ? 'pointer-events-none opacity-40' : 'hover:border-green-400'}`}
          >
            Вперед
          </Link>
        </div>
      </div>
    </div>
  );
}
