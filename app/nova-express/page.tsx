import { fetchArticles } from '@/services/ghostService';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nova Express | Zeitgeist',
  description: 'Cybernetics, Cut-ups, and the Electronic Revolution.',
};

export default async function NovaExpressPage() {
  const articles = await fetchArticles('nova');

  return (
    <div className="min-h-screen relative overflow-hidden font-mono">
      {/* Scanlines Overlay */}
      <div className="absolute inset-0 scanlines z-0 opacity-30 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        
        {/* Glitch Header */}
        <div className="text-center mb-20">
          <h1 
            className="glitch-text text-6xl md:text-8xl font-bold uppercase tracking-tighter mb-4" 
            data-text="NOVA EXPRESS"
          >
            Nova Express
          </h1>
          <div className="inline-block border border-ink dark:border-gray-600 p-2 mt-4">
            <p className="text-sm md:text-base uppercase tracking-widest">
              {"///"} SYSTEM_STATUS: <span className="text-green-600 dark:text-green-400 font-bold animate-pulse">COMPROMISED</span> {"///"}
            </p>
          </div>
          <p className="mt-6 max-w-xl mx-auto text-gray-500 dark:text-gray-400">
            &quot;The soft machine is the biological unit.&quot; <br/>
            Decoding the control system via cut-ups and cybernetics.
          </p>
        </div>

        {/* Cyber Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map(article => (
            // fx card design
            <div key={article.id} className="group relative bg-paper dark:bg-card-bg border-2 border-ink dark:border-gray-700 hover:border-accent dark:hover:border-green-500 transition-colors duration-300 p-6">
               
               {/* Decorative Corner */}
               <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink dark:border-gray-600 group-hover:border-accent dark:group-hover:border-green-500 transition-colors"></div>
               <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink dark:border-gray-600 group-hover:border-accent dark:group-hover:border-green-500 transition-colors"></div>

               <div className="mb-4 flex justify-between items-start">
                 <span className="text-xs font-bold bg-ink text-paper dark:bg-gray-800 dark:text-gray-200 px-2 py-1">
                   FILE_ID: {article.id.toUpperCase()}
                 </span>
                 <span className="text-xs text-gray-500 font-mono">
                   {new Date(article.published_at).toLocaleDateString()}
                 </span>
               </div>

               <h3 className="text-2xl font-bold leading-tight mb-4 group-hover:text-accent dark:group-hover:text-green-400 transition-colors">
                 <Link href={`/article/${article.id}`} className="before:absolute before:inset-0">
                   {article.title}
                 </Link>
               </h3>

               <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 border-l-2 border-gray-300 dark:border-gray-700 pl-4">
                 {article.excerpt}
               </p>

               <div className="flex gap-2 mt-auto">
                  {article.tags.map(tag => (
                      <span key={tag} className="text-[10px] uppercase border border-gray-400 dark:border-gray-600 px-1 text-gray-500 dark:text-gray-400">
                        #{tag}
                      </span>
                  ))}
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}