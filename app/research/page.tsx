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
    <div className="page-shell-narrow py-16 sm:py-20">
      <section className="site-panel overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgba(50,76,171,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(141,67,57,0.06),transparent_26%)] px-6 py-10 sm:px-10 sm:py-14 dark:bg-[color:var(--color-surface)]">
        <p className="section-kicker">academic index</p>
        <h1 className="section-title">Каталог исследований</h1>
        <p className="section-lead max-w-3xl">
          Рецензируемые статьи, архивные находки и академические материалы.
        </p>
      </section>

      <div className="mt-10 space-y-10">
        {papers.items.length > 0 ? (
          papers.items.map((paper, idx) => (
            <div key={paper.id} className={idx !== papers.items.length - 1 ? "border-b border-[color:var(--line-soft)] pb-10" : ""}>
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

      <div className="pagination-shell">
        <Link
          href={page > 1 ? `/research?page=${page - 1}` : '#'}
          aria-disabled={page <= 1}
          className="pagination-link"
        >
          Назад
        </Link>
        <span className="font-sans text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Страница {papers.page} из {papers.totalPages}
        </span>
        <Link
          href={page < papers.totalPages ? `/research?page=${page + 1}` : '#'}
          aria-disabled={page >= papers.totalPages}
          className="pagination-link"
        >
          Вперед
        </Link>
      </div>
    </div>
  );
}
