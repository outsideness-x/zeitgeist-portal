import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import type { Metadata } from 'next';
import Link from 'next/link';

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="border-b-4 border-double border-gray-200 pb-8 mb-12 text-center">
        <h1 className="font-display text-6xl mb-2">Журнал</h1>
        <span className="font-serif italic text-gray-400">Эссе об искусстве, истории и литературе</span>
      </div>

      <div className="space-y-20">
        {articles.items.map((article, idx) => (
          <div key={article.id} className={idx !== articles.items.length - 1 ? "border-b border-gray-200 pb-20" : ""}>
             <ArticleCard article={article} featured={true} />
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between">
        <Link
          href={page > 1 ? `/journal?page=${page - 1}` : '#'}
          aria-disabled={page <= 1}
          className={`px-4 py-2 border border-sepia text-sm uppercase tracking-wider ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-accent'}`}
        >
          Назад
        </Link>
        <span className="text-sm text-gray-500">
          Страница {articles.page} из {articles.totalPages}
        </span>
        <Link
          href={page < articles.totalPages ? `/journal?page=${page + 1}` : '#'}
          aria-disabled={page >= articles.totalPages}
          className={`px-4 py-2 border border-sepia text-sm uppercase tracking-wider ${page >= articles.totalPages ? 'pointer-events-none opacity-40' : 'hover:border-accent'}`}
        >
          Вперед
        </Link>
      </div>
    </div>
  );
}
