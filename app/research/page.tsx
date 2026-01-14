import { fetchArticles } from '@/services/ghostService';
import { ArticleCard } from '@/components/ArticleCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Research Catalog | Zeitgeist',
  description: 'Peer-reviewed papers, archival findings, and academic dispatches.',
};

export default async function ResearchPage() {
  // Загружаем данные на сервере (Server Side Rendering)
  const papers = await fetchArticles('research');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="font-display text-5xl mb-4">Research Catalog</h1>
        <p className="font-serif text-xl text-gray-500">Peer-reviewed papers, archival findings, and academic dispatches.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {papers.map(paper => (
          <div key={paper.id} className="bg-white p-6 border border-sepia shadow-sm hover:shadow-md transition-shadow">
             <div className="mb-4">
                 <span className="text-xs font-sans font-bold text-accent uppercase tracking-wider">PDF Available</span>
             </div>
             <ArticleCard article={paper} />
          </div>
        ))}
      </div>
    </div>
  );
}