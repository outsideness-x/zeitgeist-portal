import { fetchArticles } from '@/services/ghostService';
import { ArticleCard } from '@/components/ArticleCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nova Express | Zeitgeist',
  description: 'Cybernetics, Cut-ups, and the Electronic Revolution.',
};

export default async function NovaExpressPage() {
  const articles = await fetchArticles('nova');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header with a glitchy vibe */}
      <div className="text-center mb-16 relative">
        <h1 className="font-display text-6xl mb-4 tracking-tighter uppercase">
          Nova Express
        </h1>
        <p className="font-mono text-sm md:text-base text-gray-600 max-w-xl mx-auto border-t border-b border-gray-300 py-2">
          "The soft machine is the biological unit." <br/>
          Cybernetics &bull; Psychedelia &bull; Counter-Culture
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {articles.map(article => (
          <div key={article.id} className="relative">
             {/* Decorative element for Nova items */}
             <div className="absolute -top-2 -left-2 w-full h-full border border-gray-200 -z-10"></div>
             <ArticleCard article={article} />
          </div>
        ))}
      </div>
      
      {articles.length === 0 && (
          <div className="text-center py-20 font-mono text-gray-400">
              [TRANSMISSION INTERRUPTED] <br/> No signals found.
          </div>
      )}
    </div>
  );
}