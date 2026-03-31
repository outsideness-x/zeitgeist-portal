import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/EmptyState';
import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveCollectionVisualState } from '@/services/content/renderPolicy';

export const metadata: Metadata = {
  title: 'Журнал | Zeitgeist',
  description: 'Эссе об искусстве, истории и литературе Востока.',
};

type JournalPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, Number(resolvedSearchParams?.page ?? '1') || 1);

  // SSR: Загрузка данных на сервере
  const articles = await fetchArticles('journal', { page, pageSize: 6 });
  const collectionState = resolveCollectionVisualState({
    itemsCount: articles.items.length,
    fetchMeta: articles.fetchMeta,
  });

  return (
    <div className="page-shell-narrow py-16 sm:py-20">
      <section className="site-panel overflow-hidden rounded-[clamp(1.75rem,3vw,2rem)] bg-[radial-gradient(circle_at_top_left,rgba(141,67,57,0.1),transparent_36%)] px-5 py-10 sm:px-10 sm:py-14">
        <p className="section-kicker">редакционный раздел</p>
        <h1 className="section-title">Журнал</h1>
        <p className="section-lead max-w-2xl">
          Эссе об искусстве, истории и литературе Востока. Более спокойная сетка и крупнее набранный текст делают вход в материалы легче и на мобильных, и на больших экранах.
        </p>
      </section>

      <div className="mt-10 space-y-10">
        {articles.items.length > 0 ? (
          articles.items.map((article, idx) => (
            <div key={article.id} className={idx !== articles.items.length - 1 ? "border-b border-[color:var(--line-soft)] pb-10" : ""}>
              <ArticleCard article={article} featured={true} routePath="/journal" />
            </div>
          ))
        ) : collectionState === 'error' ? (
          <EmptyState
            title="раздел журнала временно недоступен"
            description="ghost api вернул ошибку. как только соединение восстановится, статьи снова появятся автоматически."
          />
        ) : (
          <EmptyState
            title="раздел журнала готовится"
            description="новые публикации появятся после синхронизации с ghost."
          />
        )}
      </div>

      <div className="pagination-shell">
        <Link
          href={page > 1 ? `/journal?page=${page - 1}` : '#'}
          aria-disabled={page <= 1}
          className="pagination-link"
        >
          Назад
        </Link>
        <span className="font-sans text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Страница {articles.page} из {articles.totalPages}
        </span>
        <Link
          href={page < articles.totalPages ? `/journal?page=${page + 1}` : '#'}
          aria-disabled={page >= articles.totalPages}
          className="pagination-link"
        >
          Вперед
        </Link>
      </div>
    </div>
  );
}
