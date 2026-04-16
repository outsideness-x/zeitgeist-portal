import { fetchArticles } from '@/services/content';
import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { NovaArticlePreviewCard } from '@/components/NovaArticlePreviewCard';
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
    <div
      className="relative isolate -mt-[var(--header-height)] min-h-[calc(100vh+var(--header-height))] overflow-hidden bg-[color:var(--c-nova-bg)] pt-[var(--header-height)] text-[color:var(--c-nova-text)]"
      data-cursor-dark
    >
      <div
        aria-hidden="true"
        className="nova-ambient-grid"
      />
      <div
        aria-hidden="true"
        className="scanlines nova-ambient-scan"
      />
      <div aria-hidden="true" className="nova-ambient-vignette" />

      <div className="page-shell relative z-10 py-[clamp(3.1rem,7vw,4.4rem)]">
        <section className="relative overflow-hidden border border-[color:var(--c-nova-rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.008))] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div aria-hidden="true" className="nova-ambient-grid nova-ambient-grid--panel" />
          <div aria-hidden="true" className="nova-ambient-signal nova-ambient-signal--panel" />
          <div aria-hidden="true" className="nova-ambient-vignette nova-ambient-vignette--panel" />
          <div aria-hidden="true" className="scanlines nova-ambient-scan nova-ambient-scan--panel pointer-events-none absolute inset-0" />
          <div className="relative min-w-0 max-w-3xl">
            <p className="font-mono text-[var(--t-xs)] uppercase tracking-[0.22em] text-[color:var(--c-nova-text-2)]">
              Nova Express / Архив андеграунда
            </p>
            <h1
              className="nova-title-cutup mt-5 font-display text-[clamp(2.45rem,8vw,5.1rem)] font-semibold leading-[0.96] tracking-[-0.03em] text-[color:var(--c-nova-text)]"
            >
              <span className="nova-title-cutup__base">Nova Express</span>
              <span aria-hidden="true" className="nova-title-cutup__slice nova-title-cutup__slice--top">Nova Express</span>
              <span aria-hidden="true" className="nova-title-cutup__slice nova-title-cutup__slice--mid">Nova Express</span>
              <span aria-hidden="true" className="nova-title-cutup__slice nova-title-cutup__slice--bot">Nova Express</span>
            </h1>
            <p className="mt-5 max-w-[42ch] font-sans text-[clamp(1rem,2.2vw,1.14rem)] leading-[1.72] text-[color:var(--c-nova-text-2)]">
              Кибернетика, cut-up, сбои, контроль и культурная инженерия: архив текстов о сигнальных системах и языках помех.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-10 w-full max-w-5xl">
          <div className="mb-6 flex flex-col gap-4 border-b border-[color:var(--c-nova-rule)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[var(--t-xs)] uppercase tracking-[0.22em] text-[color:var(--c-nova-text-2)]">последние передачи</p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.9rem)] leading-[1] tracking-[-0.035em] text-[color:var(--c-nova-text)]">
                Последние передачи
              </h2>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {articles.items.length > 0 ? (
              articles.items.map((article) => (
                <div
                  key={article.id}
                  className="border-b border-[color:var(--c-nova-rule)] pb-4 last:border-b-0 last:pb-0 sm:pb-5"
                >
                  <NovaArticlePreviewCard article={article} routePath="/nova-express" />
                </div>
              ))
            ) : collectionState === 'error' ? (
              <EmptyState
                title="nova express временно недоступен"
                description="ghost api вернул ошибку. лента восстановится автоматически после успешного запроса."
                className="border-[color:var(--c-nova-rule)] bg-black/35 shadow-none [&>p:first-child]:text-[color:var(--c-nova-accent)] [&>h2]:text-[color:var(--c-nova-text)] [&>p:last-child]:text-[color:var(--c-nova-text-2)]"
              />
            ) : (
              <EmptyState
                title="nova express готовится"
                description="поток материалов появится после публикации в ghost."
                className="border-[color:var(--c-nova-rule)] bg-black/35 shadow-none [&>p:first-child]:text-[color:var(--c-nova-accent)] [&>h2]:text-[color:var(--c-nova-text)] [&>p:last-child]:text-[color:var(--c-nova-text-2)]"
              />
            )}
          </div>
        </section>

        <div className="mx-auto mt-12 flex w-full max-w-5xl flex-col gap-4 border-t border-[color:var(--c-nova-rule)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={page > 1 ? `/nova-express?page=${page - 1}` : '#'}
            aria-disabled={page <= 1}
            className="inline-flex w-full items-center justify-center border border-[color:var(--c-nova-rule)] bg-black/20 px-4 py-2 text-center font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--c-nova-text)] transition-colors hover:border-[color:var(--c-nova-text-2)] hover:text-[color:var(--c-nova-accent)] aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:w-auto"
          >
            Назад
          </Link>
          <span className="text-center font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[color:var(--c-nova-text-2)]">
            Страница {articles.page} из {articles.totalPages}
          </span>
          <Link
            href={page < articles.totalPages ? `/nova-express?page=${page + 1}` : '#'}
            aria-disabled={page >= articles.totalPages}
            className="inline-flex w-full items-center justify-center border border-[color:var(--c-nova-rule)] bg-black/20 px-4 py-2 text-center font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--c-nova-text)] transition-colors hover:border-[color:var(--c-nova-text-2)] hover:text-[color:var(--c-nova-accent)] aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:w-auto"
          >
            Вперед
          </Link>
        </div>
      </div>
    </div>
  );
}
