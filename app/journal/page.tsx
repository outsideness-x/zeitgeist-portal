import { fetchArticles } from '@/services/ghostService';
import { ArticleCard } from '@/components/ArticleCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Журнал | Zeitgeist',
  description: 'Эссе об искусстве, истории и литературе Востока.',
};

export default async function JournalPage() {
  // SSR: Загрузка данных на сервере
  const articles = await fetchArticles('journal');

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="border-b-4 border-double border-gray-200 pb-8 mb-12 text-center">
        <h1 className="font-display text-6xl mb-2">Журнал</h1>
        <span className="font-serif italic text-gray-400">Эссе об искусстве, истории и литературе</span>
      </div>

      <div className="space-y-20">
        {articles.map((article, idx) => (
          <div key={article.id} className={idx !== articles.length - 1 ? "border-b border-gray-200 pb-20" : ""}>
             <ArticleCard article={article} featured={true} />
          </div>
        ))}
      </div>
    </div>
  );
}
