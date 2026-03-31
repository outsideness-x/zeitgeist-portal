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
    <div className="crt-effect min-h-screen overflow-hidden bg-[color:var(--nova-bg)] font-mono text-[color:var(--nova-text)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(88,242,157,0.18),transparent_30%),linear-gradient(rgba(88,242,157,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(88,242,157,0.05)_1px,transparent_1px)] [background-size:auto,44px_44px,44px_44px]" />

      <div className="page-shell relative z-10 py-[clamp(3.5rem,7vw,4.5rem)]">
        <section className="relative overflow-hidden rounded-[clamp(1.75rem,3vw,2rem)] border border-[#58f29d]/18 bg-black/28 px-4 py-6 shadow-[0_40px_100px_rgba(0,0,0,0.48)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="scanlines absolute inset-0 opacity-[0.07]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(88,242,157,0.18),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(70,132,255,0.1),transparent_24%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <div className="min-w-0 max-w-3xl">
              <p className="nova-label">signal channel / side frequency / issue {page}</p>
              <h1
                className="glitch-text mt-[clamp(1rem,2.6vw,1.5rem)] max-w-[10ch] font-mono text-[clamp(2.4rem,11vw,6.4rem)] font-semibold uppercase leading-[0.94] tracking-[-0.045em]"
                data-text="NOVA EXPRESS"
              >
                Nova Express
              </h1>
              <p className="mt-5 max-w-2xl font-serif text-[clamp(1rem,3vw,1.25rem)] leading-relaxed text-[color:var(--nova-muted)]">
                &quot;Мягкая машина — это биологическая единица.&quot;
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {['cut-up', 'cybernetics', 'control systems', 'electronic revolution'].map((tag) => (
                  <span key={tag} className="nova-pill">{tag}</span>
                  
                ))}
              </div>
            </div>

          </div>
        </section>

        <section className="mx-auto mt-10 w-full max-w-5xl">
          <div className="mb-6 flex flex-col gap-4 border-b border-[#58f29d]/14 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="nova-label">latest transmissions</p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.9rem)] leading-[1] tracking-[-0.035em] text-white">
                Последние передачи
              </h2>
            </div>
          </div>

          <div className="space-y-8">
            {articles.items.length > 0 ? (
              articles.items.map((article, idx) => (
                <div key={article.id} className={idx !== articles.items.length - 1 ? "border-b border-[#58f29d]/14 pb-8" : ""}>
                  <ArticleCard article={article} featured={true} routePath="/nova-express" />
                </div>
              ))
            ) : collectionState === 'error' ? (
              <EmptyState
                title="nova express временно недоступен"
                description="ghost api вернул ошибку. лента восстановится автоматически после успешного запроса."
                className="border-[#23442d] bg-black/45 shadow-none [&>p:first-child]:text-[#6dd8a2] [&>h2]:text-[#ecfff4] [&>p:last-child]:text-[#a6d7b7]"
              />
            ) : (
              <EmptyState
                title="nova express готовится"
                description="поток материалов появится после публикации в ghost."
                className="border-[#23442d] bg-black/45 shadow-none [&>p:first-child]:text-[#6dd8a2] [&>h2]:text-[#ecfff4] [&>p:last-child]:text-[#a6d7b7]"
              />
            )}
          </div>
        </section>

        <div className="mx-auto mt-12 flex w-full max-w-5xl flex-col gap-4 border-t border-[#58f29d]/14 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={page > 1 ? `/nova-express?page=${page - 1}` : '#'}
            aria-disabled={page <= 1}
            className="inline-flex w-full items-center justify-center rounded-full border border-[#58f29d]/24 bg-black/30 px-4 py-2 text-center font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#c8ffd9] transition-colors hover:border-[#58f29d]/46 hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:w-auto"
          >
            Назад
          </Link>
          <span className="text-center font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[color:var(--nova-muted)]">
            Страница {articles.page} из {articles.totalPages}
          </span>
          <Link
            href={page < articles.totalPages ? `/nova-express?page=${page + 1}` : '#'}
            aria-disabled={page >= articles.totalPages}
            className="inline-flex w-full items-center justify-center rounded-full border border-[#58f29d]/24 bg-black/30 px-4 py-2 text-center font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#c8ffd9] transition-colors hover:border-[#58f29d]/46 hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:w-auto"
          >
            Вперед
          </Link>
        </div>
      </div>
    </div>
  );
}
