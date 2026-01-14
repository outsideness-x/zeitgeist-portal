import Link from 'next/link';
import { fetchArticles } from '@/services/ghostService';
import { ArticleCard } from '@/components/ArticleCard';

export default async function Home() {
  // data fetching on server
  const articles = await fetchArticles();

  const featured = articles[0];
  const journalArticles = articles.filter(a => a.type === 'journal').slice(1, 4);
  const researchPapers = articles.filter(a => a.type === 'research').slice(0, 4);

  return (
    <div className="pb-20">
      {/* Hero Section - FIXED: Colors for Dark Mode */}
      <section className="bg-paper text-ink dark:bg-black dark:text-gray-100 py-20 px-4 text-center transition-colors duration-300 border-b border-transparent dark:border-gray-800">
        <h1 className="font-display text-5xl md:text-7xl mb-6">The Zeitgeist</h1>
        <p className="font-serif text-xl md:text-2xl text-gray-500 dark:text-gray-400 italic max-w-2xl mx-auto">
          &quot;The spirit of the times.&quot; Uncovering the history, culture, and manuscripts of the East.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        {/* Featured Article */}
        {featured && (
          <div className="bg-paper dark:bg-card-bg p-6 md:p-10 shadow-xl border border-sepia dark:border-gray-700 mb-20 transition-colors duration-300">
            <ArticleCard article={featured} featured={true} />
          </div>
        )}

        {/* Two Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Feed (Journal) */}
          <div className="lg:col-span-8">
            <div className="flex items-baseline justify-between mb-8 border-b-2 border-black dark:border-gray-700 pb-2">
              <h2 className="font-display text-3xl">From The Journal</h2>
              <Link href="/journal" className="font-sans text-sm font-bold uppercase text-accent hover:text-black dark:hover:text-white transition-colors">View All</Link>
            </div>
            
            <div className="space-y-12">
              {journalArticles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>

          {/* Sidebar (Latest Research) */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Research List */}
            <div>
              <div className="flex items-baseline justify-between mb-8 border-b-2 border-accent pb-2">
                <h2 className="font-display text-2xl text-accent">Latest Research</h2>
                <Link href="/research" className="font-sans text-xs font-bold uppercase text-gray-500 hover:text-accent transition-colors">Catalog</Link>
              </div>

              <div className="space-y-6">
                {researchPapers.map(paper => (
                  <div key={paper.id} className="group">
                    <span className="block text-xs font-sans text-gray-400 mb-1">{new Date(paper.published_at).toLocaleDateString()}</span>
                    <h4 className="font-serif text-lg leading-tight mb-2 group-hover:text-accent transition-colors dark:text-gray-200">
                      <Link href={`/article/${paper.id}`}>{paper.title}</Link>
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{paper.excerpt}</p>
                    <div className="mt-2 flex gap-2">
                        {paper.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] uppercase border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-gray-500 dark:text-gray-400">{tag}</span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donation CTA */}
            <div className="bg-sepia dark:bg-gray-900 p-8 text-center border border-gray-300 dark:border-gray-700 transition-colors">
                <h3 className="font-display text-2xl mb-4">Support Our Work</h3>
                <p className="font-serif text-sm mb-6 text-gray-700 dark:text-gray-400">Help us keep the archives open and free for all scholars.</p>
                <Link href="/donate" className="inline-block px-6 py-3 bg-accent text-white font-sans uppercase text-sm tracking-widest hover:bg-black dark:hover:bg-gray-700 transition-colors">
                    Donate Now
                </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}