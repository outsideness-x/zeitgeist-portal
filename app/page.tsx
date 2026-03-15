import Link from 'next/link';
import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/EmptyState';
import { FadeIn } from '@/components/FadeIn';
import { resolveCollectionVisualState } from '@/services/content/renderPolicy';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // data fetching on server
  const articlesResult = await fetchArticles(undefined, { page: 1, pageSize: 20 });
  const articles = articlesResult.items;
  const feedState = resolveCollectionVisualState({
    itemsCount: articles.length,
    fetchMeta: articlesResult.fetchMeta,
  });

  const featured = articles[0];
  const journalArticles = articles.filter(a => a.type === 'journal').slice(1, 4);
  const researchPapers = articles.filter(a => a.type === 'research').slice(0, 4);

  return (
    <div className="pb-20">
      <section className="relative min-h-[80vh] overflow-hidden flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 scale-105 blur-sm bg-[radial-gradient(circle_at_16%_20%,rgba(139,58,58,0.35),transparent_42%),radial-gradient(circle_at_85%_28%,rgba(24,24,24,0.65),transparent_48%),linear-gradient(140deg,#050505_0%,#14100f_42%,#2a1f1b_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

        <FadeIn>
          <div className="relative z-10 mx-auto max-w-6xl text-center text-white mix-blend-difference">
            <h1 className="font-display text-[12vw] leading-none tracking-tighter uppercase">Zeitgeist</h1>
            <p className="mt-8 font-serif text-2xl md:text-4xl font-light italic">
              &quot;Дух времени.&quot; Исследуем историю, культуру и
              <span className="text-accent"> рукописи Востока</span>.
            </p>
          </div>
        </FadeIn>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        {/* Featured Article */}
        <div className="bg-paper dark:bg-card-bg p-6 md:p-10 shadow-xl border border-sepia dark:border-gray-700 mb-20 transition-colors duration-300">
          {featured ? (
            <ArticleCard article={featured} featured={true} routePath="/" />
          ) : feedState === 'error' ? (
            <EmptyState
              title="не удалось загрузить главный материал"
              description="ghost временно недоступен. показываем последнюю стабильную версию сразу после восстановления."
              className="border-0 bg-transparent p-0"
            />
          ) : (
            <EmptyState
              title="главный материал готовится"
              description="публикация появится после синхронизации с ghost."
              className="border-0 bg-transparent p-0"
            />
          )}
        </div>

        {/* Two Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Feed (Journal) */}
          <div className="lg:col-span-8">
            <div className="flex items-baseline justify-between mb-8 border-b-2 border-black dark:border-gray-700 pb-2">
              <h2 className="font-display text-3xl">Из журнала</h2>
              <Link href="/journal" className="font-sans text-sm font-bold uppercase text-accent hover:text-black dark:hover:text-white transition-colors">Смотреть все</Link>
            </div>
            
            <div className="space-y-12">
              {journalArticles.length > 0 ? (
                journalArticles.map(article => (
                  <ArticleCard key={article.id} article={article} routePath="/" />
                ))
              ) : feedState === 'error' ? (
                <EmptyState
                  title="журнал временно недоступен"
                  description="не удалось получить данные из ghost. попробуйте обновить страницу через минуту."
                />
              ) : (
                <EmptyState
                  title="раздел журнала готовится"
                  description="первые статьи появятся здесь после публикации."
                />
              )}
            </div>
          </div>

          {/* Sidebar (Latest Research) */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Research List */}
            <div>
              <div className="flex items-baseline justify-between mb-8 border-b-2 border-accent pb-2">
                <h2 className="font-display text-2xl text-accent">Последние исследования</h2>
                <Link href="/research" className="font-sans text-xs font-bold uppercase text-gray-500 hover:text-accent transition-colors">Каталог</Link>
              </div>

              <div className="space-y-6">
                {researchPapers.length > 0 ? (
                  researchPapers.map(paper => (
                    <div key={paper.id} className="group">
                      <span className="block text-xs font-sans text-gray-400 mb-1">{new Date(paper.published_at).toLocaleDateString()}</span>
                      <h4 className="font-serif text-lg leading-tight mb-2 group-hover:text-accent transition-colors dark:text-gray-200">
                        <Link href={`/article/${paper.id}`}>{paper.title}</Link>
                      </h4>
                      <p className="text-base text-gray-600 dark:text-gray-400 line-clamp-2">{paper.excerpt}</p>
                      <div className="mt-2 flex gap-2">
                        {paper.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] uppercase border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-gray-500 dark:text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : feedState === 'error' ? (
                  <EmptyState
                    title="исследования временно недоступны"
                    description="получение данных из ghost завершилось ошибкой. как только API восстановится, список появится автоматически."
                  />
                ) : (
                  <EmptyState
                    title="исследования скоро появятся"
                    description="каталог заполнится после подключения контента."
                  />
                )}
              </div>
            </div>

            {/* Donation CTA */}
            <div className="bg-sepia dark:bg-card-bg p-8 text-center border border-gray-300 dark:border-gray-700 transition-colors">
                <h3 className="font-display text-2xl mb-4">Поддержите нашу работу</h3>
                <p className="font-serif text-sm mb-6 text-gray-700 dark:text-gray-400">Помогите нам сохранять архивы открытыми и бесплатными для всех исследователей.</p>
                <Link href="/donate" className="inline-block px-6 py-3 bg-accent text-white font-sans uppercase text-sm tracking-widest hover:bg-black dark:hover:bg-gray-700 transition-colors">
                    Поддержать сейчас
                </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
