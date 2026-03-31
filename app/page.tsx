import Link from 'next/link';
import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/EmptyState';
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
  const journalArticles = articles.filter(a => a.type === 'journal' && a.id !== featured?.id).slice(0, 3);
  const researchPapers = articles.filter(a => a.type === 'research' && a.id !== featured?.id).slice(0, 4);
  const novaDispatches = articles.filter(a => a.type === 'nova' && a.id !== featured?.id).slice(0, 2);

  return (
    <div className="pb-24">
      <section className="relative px-4 py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(141,67,57,0.28),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(145deg,#050404_0%,#0d0a09_52%,#181311_100%)] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.035),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(141,67,57,0.08),transparent_22%),linear-gradient(145deg,#020202_0%,#060708_52%,#0c0d10_100%)]" />

        <div className="page-shell relative z-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12">
            <div className="max-w-4xl text-white">
              <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/62 sm:text-[0.72rem] sm:tracking-[0.3em]">
                digital journal · archive · research portal
              </p>
              <h1 className="mt-4 max-w-[10ch] font-display text-[clamp(3.25rem,14vw,7.25rem)] leading-[0.92] tracking-[-0.05em] uppercase">
                Zeitgeist
              </h1>
              <p className="mt-5 max-w-3xl font-serif text-[clamp(1.1rem,4.2vw,1.9rem)] leading-[1.3] text-white/88">
                &laquo;Zeitgeist&raquo; — это платформа публикации и развития независимых исследований, объединяющая авторов из разных областей знания.
              </p>
              <p className="mt-5 max-w-2xl font-sans text-[0.82rem] leading-relaxed text-white/60 sm:text-sm sm:uppercase sm:tracking-[0.14em]">
                Для исследователей, читателей и тех, кому важна долговечная интеллектуальная среда.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1 lg:gap-4">
              <Link href="/journal" className="rounded-[1.5rem] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-md transition-transform hover:-translate-y-1">
                <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#d7d0ca]">Журнал</p>
                <h2 className="mt-3 font-display text-[1.45rem] leading-[1.02] tracking-[-0.03em] text-[#fffaf6]">Эссе и заметки</h2>
                <p className="mt-3 font-serif text-sm leading-relaxed text-[#e8e0d8]">Редакционная линия о культуре, истории и литературе.</p>
              </Link>
              <Link href="/research" className="rounded-[1.5rem] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-md transition-transform hover:-translate-y-1">
                <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#d7d0ca]">Research</p>
                <h2 className="mt-3 font-display text-[1.45rem] leading-[1.02] tracking-[-0.03em] text-[#fffaf6]">Каталог исследований</h2>
                <p className="mt-3 font-serif text-sm leading-relaxed text-[#e8e0d8]">Рецензируемые тексты, архивные находки и академические материалы.</p>
              </Link>
              <Link href="/nova-express" className="rounded-[1.5rem] border border-[#58f29d]/18 bg-[#050706]/70 p-5 backdrop-blur-md transition-transform hover:-translate-y-1">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[#9df5c3]">Nova</p>
                <h2 className="mt-3 font-display text-[1.45rem] leading-[1.02] tracking-[-0.03em] text-[#f0fff6]">Nova Express</h2>
                <p className="mt-3 font-serif text-sm leading-relaxed text-[#dbf8e7]">Кибернетика, кат-ап, электронная революция и эстетика сбоя.</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper px-4 pt-12 transition-colors duration-300 dark:bg-card-bg sm:px-6 lg:px-8 md:pt-14">
        <div className="page-shell">
          <div className="mb-16 md:mb-20">
            <div className="mb-8">
              <p className="section-kicker">главный материал</p>
              <h2 className="mt-3 font-display text-[clamp(2.3rem,4vw,3.5rem)] leading-none tracking-[-0.04em] text-ink">
                Ключевая публикация недели
              </h2>
            </div>
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

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-8">
              <div className="mb-8 flex flex-col gap-4 border-b border-[color:var(--line-soft)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-kicker">редакционная лента</p>
                  <h2 className="mt-3 font-display text-[clamp(1.85rem,4vw,2.75rem)] leading-[1] tracking-[-0.035em] text-ink">Из журнала</h2>
                </div>
                <Link href="/journal" className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-accent transition-colors hover:text-ink dark:hover:text-white">
                  Смотреть все
                </Link>
              </div>

              <div className="space-y-10">
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

            <div className="space-y-8 lg:col-span-4">
              <div className="site-panel rounded-[1.75rem] p-6 sm:p-7">
                <div className="mb-6 flex items-end justify-between gap-4 border-b border-[color:var(--line-soft)] pb-4">
                  <div>
                    <p className="section-kicker">research</p>
                    <h2 className="mt-3 font-display text-[1.8rem] leading-[1] tracking-[-0.035em] text-accent">Последние исследования</h2>
                  </div>
                  <Link href="/research" className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] transition-colors hover:text-accent">
                    Каталог
                  </Link>
                </div>

                <div className="space-y-6">
                  {researchPapers.length > 0 ? (
                    researchPapers.map(paper => (
                      <div key={paper.id} className="group border-b border-[color:var(--line-soft)] pb-6 last:border-b-0 last:pb-0">
                        <span className="mb-2 block font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          {new Date(paper.published_at).toLocaleDateString()}
                        </span>
                        <h4 className="mb-2 font-display text-[1.45rem] leading-[1.06] tracking-[-0.03em] transition-colors group-hover:text-accent dark:text-gray-200">
                          <Link href={`/article/${paper.id}`}>{paper.title}</Link>
                        </h4>
                        <p className="line-clamp-3 text-[1rem] leading-relaxed text-[color:var(--muted)] dark:text-gray-400">{paper.excerpt}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {paper.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="meta-pill">{tag}</span>
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

              <div className="site-panel rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(141,67,57,0.12),transparent_75%)] p-8 text-center transition-colors">
                <p className="section-kicker">поддержка проекта</p>
                <h3 className="mt-3 font-display text-[2.2rem] leading-none tracking-[-0.04em]">Поддержите нашу работу</h3>
                <p className="mt-4 font-serif text-[1rem] leading-relaxed text-[color:var(--muted)]">
                  Помогите нам сохранять архивы открытыми и бесплатными для исследователей, преподавателей и читателей.
                </p>
                <Link href="/donate" className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-3 font-sans text-[0.76rem] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black dark:hover:bg-gray-700">
                  Поддержать сейчас
                </Link>
              </div>
            </div>
          </div>

          <section className="mt-20">
            <div className="crt-effect relative overflow-hidden rounded-[2rem] border border-[#58f29d]/16 bg-[linear-gradient(180deg,rgba(5,7,6,0.98),rgba(7,12,9,0.98))] p-6 text-[#f0fff6] shadow-[0_34px_90px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
              <div className="scanlines absolute inset-0 opacity-[0.08]" aria-hidden="true" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_24%,rgba(88,242,157,0.18),transparent_28%),radial-gradient(circle_at_84%_20%,rgba(88,164,242,0.08),transparent_26%)]" />
              <div className="relative grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
                <div>
                  <p className="nova-label">signal channel / editorial sideband</p>
                  <h2
                    className="glitch-text mt-5 max-w-[10ch] font-mono text-[clamp(2.25rem,9vw,4.75rem)] font-semibold uppercase leading-[0.94] tracking-[-0.04em]"
                    data-text="NOVA EXPRESS"
                  >
                    Nova Express
                  </h2>
                  <p className="mt-6 max-w-xl font-serif text-[1.1rem] leading-relaxed text-[#d5ffe5]/78">
                    Драматичная, но собранная линия о кибернетике, кат-апе и системах контроля. Мы сохранили характер Nova и дали ему больше воздуха, ритма и читаемости.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {['cat-up', 'cybernetics', 'control', 'electronic revolution'].map((tag) => (
                      <span key={tag} className="nova-pill">{tag}</span>
                    ))}
                  </div>
                  <Link href="/nova-express" className="mt-8 inline-flex items-center rounded-full border border-[#58f29d]/28 bg-black/30 px-5 py-3 font-mono text-[0.74rem] uppercase tracking-[0.2em] text-[#bfffd6] transition-colors hover:border-[#58f29d]/48 hover:text-white">
                    Открыть канал
                  </Link>
                </div>

                <div className="space-y-4">
                  {novaDispatches.length > 0 ? (
                    novaDispatches.map((article) => (
                      <Link
                        key={article.id}
                        href={`/article/${article.id}`}
                        className="block rounded-[1.35rem] border border-[#58f29d]/18 bg-black/28 p-5 transition-transform hover:-translate-y-1"
                      >
                        <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-[#a6ffca]/62">
                          {new Date(article.published_at).toLocaleDateString()} · {article.reading_time ? `${article.reading_time} мин` : 'короткий сигнал'}
                        </p>
                        <h3 className="mt-3 font-display text-[1.85rem] leading-[0.98] tracking-[-0.04em] text-[#f3fff7]">
                          {article.title}
                        </h3>
                        <p className="mt-3 line-clamp-3 font-serif text-[1rem] leading-relaxed text-[#d6ffe6]/72">
                          {article.excerpt}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <EmptyState
                      title="nova express синхронизируется"
                      description="как только публикации станут доступны, этот блок автоматически соберет последние передачи канала."
                      className="border-[#23442d] bg-black/45 shadow-none [&>p:first-child]:text-[#6dd8a2] [&>h2]:text-[#ecfff4] [&>p:last-child]:text-[#a6d7b7]"
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
