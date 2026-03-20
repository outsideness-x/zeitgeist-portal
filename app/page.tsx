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
      <section className="relative overflow-hidden px-4 py-20 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(139,58,58,0.2),transparent_46%),linear-gradient(145deg,#050404_0%,#0d0a09_52%,#181311_100%)]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <FadeIn>
            <div className="mx-auto max-w-4xl text-center text-white">
              <h1 className="pt-1 font-display text-[12vw] leading-[1.03] tracking-tighter uppercase md:pt-0 md:leading-none">Zeitgeist</h1>
              <p className="mt-6 font-serif text-2xl font-light italic md:text-4xl">
                &laquo;Дух времени&raquo;. Исследуем историю, культуру и
                <span> рукописи Востока</span>.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="bg-paper px-4 pt-12 transition-colors duration-300 dark:bg-card-bg sm:px-6 lg:px-8 md:pt-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 md:mb-20">
            {featured ? (
              <ArticleCard article={featured} featured={true} routePath="/" />
            ) : feedState === 'error' ? (
              <EmptyState
                title="не удалось загрузить главный материал"
                description="ghost временно недоступен. показываем последнюю стабильную версию сразу после восстановления."
              />
            ) : (
              <EmptyState
                title="главный материал готовится"
                description="публикация появится после синхронизации с ghost."
              />
            )}
          </div>

          {/* Two Columns Layout */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main Feed (Journal) */}
            <div className="lg:col-span-8">
              <div className="mb-8 flex items-baseline justify-between border-b-2 border-black pb-2 dark:border-gray-700">
                <h2 className="font-display text-3xl">Из журнала</h2>
                <Link href="/journal" className="font-sans text-sm font-bold uppercase text-accent transition-colors hover:text-black dark:hover:text-white">Смотреть все</Link>
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
            <div className="space-y-12 lg:col-span-4">
              {/* Research List */}
              <div>
                <div className="mb-8 flex items-baseline justify-between border-b-2 border-accent pb-2">
                  <h2 className="font-display text-2xl text-accent">Последние исследования</h2>
                  <Link href="/research" className="font-sans text-xs font-bold uppercase text-gray-500 transition-colors hover:text-accent">Каталог</Link>
                </div>

                <div className="space-y-6">
                  {researchPapers.length > 0 ? (
                    researchPapers.map(paper => (
                      <div key={paper.id} className="group">
                        <span className="mb-1 block text-xs font-sans text-gray-400">{new Date(paper.published_at).toLocaleDateString()}</span>
                        <h4 className="mb-2 font-serif text-lg leading-tight transition-colors group-hover:text-accent dark:text-gray-200">
                          <Link href={`/article/${paper.id}`}>{paper.title}</Link>
                        </h4>
                        <p className="line-clamp-2 text-base text-gray-600 dark:text-gray-400">{paper.excerpt}</p>
                        <div className="mt-2 flex gap-2">
                          {paper.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="border border-gray-300 px-2 py-0.5 text-[10px] uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">{tag}</span>
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
              <div className="border border-gray-300 bg-sepia p-8 text-center transition-colors dark:border-gray-700 dark:bg-card-bg">
                <h3 className="mb-4 font-display text-2xl">Поддержите нашу работу</h3>
                <p className="mb-6 font-serif text-sm text-gray-700 dark:text-gray-400">Помогите нам сохранять архивы открытыми и бесплатными для всех исследователей.</p>
                <Link href="/donate" className="inline-block bg-accent px-6 py-3 font-sans text-sm uppercase tracking-widest text-white transition-colors hover:bg-black dark:hover:bg-gray-700">
                  Поддержать сейчас
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
