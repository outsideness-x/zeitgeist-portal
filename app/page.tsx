import Link from 'next/link';
import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/EmptyState';
import { resolveCollectionVisualState } from '@/services/content/renderPolicy';
import { formatDate } from '@/utils/formatDate';

export const dynamic = 'force-dynamic';

const HERO_NAV_ITEMS = [
  { href: '/journal', label: 'ЦИФРОВОЙ ЖУРНАЛ' },
  { href: '/library', label: 'АРХИВ' },
  { href: '/research', label: 'ИССЛЕДОВАНИЯ' },
];

const getResearchSidebarTags = (tags: string[]) => {
  return tags
    .filter((tag) => {
      const normalizedTag = tag.trim().replace(/^#+/, '').toLowerCase();
      return normalizedTag.length > 0 && normalizedTag !== 'research' && normalizedTag !== 'исследование';
    })
    .slice(0, 2);
};

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
    <div className="pb-24 dark:bg-[color:var(--color-canvas)]">
      <section className="border-b border-[color:var(--line-soft)] bg-[radial-gradient(circle_at_top_left,var(--paper-glow),transparent_34%),linear-gradient(180deg,var(--background-elevated)_0%,var(--background)_100%)] transition-colors duration-300 dark:bg-[color:var(--color-canvas)]">
        <div className="page-shell pt-[clamp(1.5rem,3.8vw,2.9rem)] pb-[clamp(1.9rem,4vw,3.2rem)]">
          <div className="mx-auto max-w-[72rem]">
            <div className="hero-inner grid gap-5 md:gap-7 lg:grid-cols-[13.5rem_minmax(0,54rem)]">
              <div className="hero-left max-w-[12rem]">
                <nav aria-label="Навигация по разделам Zeitgeist">
                  <ul className="flex flex-col gap-1.5">
                    {HERO_NAV_ITEMS.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="hero-nav-link inline-flex font-sans text-[clamp(1rem,1.24vw,1.45rem)] font-semibold uppercase leading-[1.1] tracking-[-0.03em] text-[color:var(--ink-soft)]"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>

              <div className="hero-right max-w-[50rem] border-t border-[color:var(--line-strong)] pt-5 lg:border-t-0 lg:pt-0">
                <p className="font-display text-[clamp(1.62rem,1.86vw,2.18rem)] leading-[1.3] tracking-[-0.038em] text-ink dark:text-[color:var(--foreground)]">
                  &laquo;Zeitgeist&raquo; — это платформа публикации и развития независимых исследований, объединяющая авторов из разных областей знания.
                </p>
                <p className="hero-subtitle mt-5 font-sans text-[clamp(0.94rem,1.04vw,1.14rem)] font-semibold uppercase leading-[1.38] tracking-[0.02em] text-[color:var(--muted-strong)] dark:text-[color:var(--muted-strong)]">
                  Для исследователей, читателей и тех, кому важна долго&shy;вечная интеллектуальная среда.
                </p>
              </div>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3 md:auto-rows-fr lg:mt-10 lg:gap-5">
              <Link
                href="/journal"
                className="group flex h-full min-h-[14.5rem] flex-col rounded-[1.75rem] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,252,248,0.94),rgba(247,239,229,0.88))] p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--line-strong)] dark:border-[color:var(--line-soft)] dark:[background-image:none] dark:bg-[color:var(--color-surface)] dark:hover:bg-[color:var(--color-elevated)] sm:p-7"
              >
                <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-accent">Журнал</p>
                <h2 className="mt-4 max-w-[10ch] font-display text-[clamp(1.58rem,2.15vw,1.95rem)] leading-[1.02] tracking-[-0.04em] text-ink dark:text-gray-100">
                  Эссе и заметки
                </h2>
                <p className="mt-4 max-w-[30ch] font-serif text-[0.94rem] leading-[1.58] text-[color:var(--muted)] dark:text-[color:var(--muted)]">
                  Редакционная линия о культуре, истории и литературе с аккуратным ритмом чтения.
                </p>
                <span className="mt-auto pt-8 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-strong)] transition-colors group-hover:text-accent dark:text-[color:var(--muted-strong)]">
                  Перейти в раздел
                </span>
              </Link>

              <Link
                href="/research"
                className="group flex h-full min-h-[14.5rem] flex-col rounded-[1.75rem] border border-[color:var(--line-soft)] bg-[radial-gradient(circle_at_top_right,rgba(86,104,196,0.12),transparent_34%),linear-gradient(180deg,rgba(251,250,255,0.96),rgba(239,236,250,0.9))] p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--line-strong)] dark:border-[color:var(--line-soft)] dark:[background-image:none] dark:bg-[color:var(--color-surface)] dark:hover:bg-[color:var(--color-elevated)] sm:p-7"
              >
                <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-strong)] dark:text-[color:var(--muted-strong)]">Исследования</p>
                <h2 className="mt-4 max-w-[11ch] font-display text-[clamp(1.58rem,2.15vw,1.95rem)] leading-[1.02] tracking-[-0.04em] text-ink dark:text-gray-100">
                  Каталог исследований
                </h2>
                <p className="mt-4 max-w-[31ch] font-serif text-[0.94rem] leading-[1.58] text-[color:var(--muted)] dark:text-[color:var(--muted)]">
                  Рецензируемые тексты, архивные находки и академические материалы с чистой иерархией.
                </p>
                <span className="mt-auto pt-8 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-strong)] transition-colors group-hover:text-accent dark:text-[color:var(--muted-strong)] dark:group-hover:text-accent">
                  Смотреть каталог
                </span>
              </Link>

              <Link
                href="/nova-express"
                className="group flex h-full min-h-[14.5rem] flex-col rounded-[1.75rem] border border-[rgba(61,219,150,0.12)] bg-[color:var(--color-nova-bg)] p-6 shadow-[0_26px_70px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(61,219,150,0.22)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.38)] sm:p-7"
              >
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-[#9df5c3]">Nova</p>
                <h2 className="mt-4 max-w-[10ch] font-display text-[clamp(1.58rem,2.15vw,1.95rem)] leading-[1.04] tracking-[-0.03em] text-[#f3fff8]">
                  Nova Express
                </h2>
                <p className="mt-4 max-w-[31ch] font-sans text-[0.92rem] leading-[1.62] text-[#c5e8d4]">
                  Кибернетика, кат-ап, электронная революция и эстетика сигнала, шума и сбоя.
                </p>
                <span className="mt-auto pt-8 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[#bfffd6] transition-colors group-hover:text-white">
                  Открыть канал
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper px-4 pt-10 transition-colors duration-300 dark:bg-[color:var(--color-canvas)] sm:px-6 md:pt-12 lg:px-8">
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
                    <p className="section-kicker">исследования</p>
                    <h2 className="mt-3 font-display text-[1.8rem] leading-[1] tracking-[-0.035em] text-accent">Последние исследования</h2>
                  </div>
                  <Link href="/research" className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] transition-colors hover:text-accent">
                    Каталог
                  </Link>
                </div>

                <div className="space-y-6">
                  {researchPapers.length > 0 ? (
                    researchPapers.map((paper) => {
                      const sidebarTags = getResearchSidebarTags(paper.tags);

                      return (
                        <div key={paper.id} className="group border-b border-[color:var(--line-soft)] pb-6 last:border-b-0 last:pb-0">
                          <span className="mb-2 block font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                            {formatDate(paper.published_at)}
                          </span>
                          <h4 className="mb-2 font-display text-[1.45rem] leading-[1.06] tracking-[-0.03em] transition-colors group-hover:text-accent dark:text-gray-200">
                            <Link href={`/article/${paper.id}`}>{paper.title}</Link>
                          </h4>
                          <p className="line-clamp-3 text-[1rem] leading-relaxed text-[color:var(--muted)] dark:text-gray-400">{paper.excerpt}</p>
                          {sidebarTags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sidebarTags.map((tag) => (
                                <span key={tag} className="meta-pill">{tag}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
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

              <div className="site-panel rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(141,67,57,0.12),transparent_75%)] p-8 text-center transition-colors dark:bg-[color:var(--color-surface)]">
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

          <section className="mt-20" data-cursor-dark>
            <div className="crt-effect relative overflow-hidden rounded-[2rem] border border-[rgba(61,219,150,0.12)] bg-[color:var(--color-nova-bg)] p-6 text-[#f0fff6] shadow-[0_34px_90px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
              <div className="scanlines absolute inset-0 opacity-[0.08]" aria-hidden="true" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_24%,rgba(88,242,157,0.18),transparent_28%),radial-gradient(circle_at_84%_20%,rgba(88,164,242,0.08),transparent_26%)]" />
              <div className="relative grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
                <div>
                  <p className="nova-label">сигнальный канал / редакционный поток</p>
                  <h2
                    className="glitch-text mt-5 max-w-[10ch] font-mono text-[clamp(2.25rem,9vw,4.75rem)] font-semibold uppercase leading-[0.94] tracking-[-0.04em]"
                    data-text="NOVA EXPRESS"
                  >
                    Nova Express
                  </h2>
                  <p className="mt-6 max-w-xl font-serif text-[1.1rem] leading-relaxed text-[#d5ffe5]/78">
                    Заметки и исследования на тему контркультуры, андерграунда и границ Контроля.
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

                <div className="grid auto-rows-fr gap-4">
                  {novaDispatches.length > 0 ? (
                    novaDispatches.map((article) => (
                      <Link
                        key={article.id}
                        href={`/article/${article.id}`}
                        className="flex h-full min-h-[14.5rem] flex-col rounded-[1.45rem] border border-[rgba(61,219,150,0.12)] bg-[color:var(--color-nova-bg)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(61,219,150,0.22)] sm:p-6"
                      >
                        <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-[#a6ffca]/62">
                          {formatDate(article.published_at)} · {article.reading_time ? `${article.reading_time} мин` : 'короткий сигнал'}
                        </p>
                        <h3 className="mt-3 max-w-[14ch] line-clamp-3 font-sans text-[clamp(1.45rem,2vw,1.72rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-[#f3fff7]">
                          {article.title}
                        </h3>
                        <p className="mt-3 line-clamp-3 font-serif text-[0.95rem] leading-[1.58] text-[#d6ffe6]/72">
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
