import { fetchArticles } from '@/services/ghostService';
import { ArticleCard } from '@/components/ArticleCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Каталог исследований | Zeitgeist',
  description: 'Рецензируемые статьи, архивные находки и академические материалы.',
};

export default async function ResearchPage() {
  const papers = await fetchArticles('research');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl mb-4">Каталог исследований</h1>
        <p className="font-serif text-xl text-gray-500">Рецензируемые статьи, архивные находки и академические материалы.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {papers.map(paper => (
          // ИСПРАВЛЕНО: dark:bg-card-bg и dark:border-gray-800
          <div key={paper.id} className="bg-white dark:bg-card-bg p-6 border border-sepia dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
             <div className="mb-4">
                 <span className="text-xs font-sans font-bold text-accent uppercase tracking-wider">PDF доступен</span>
             </div>
             <ArticleCard article={paper} />
          </div>
        ))}
      </div>
    </div>
  );
}
