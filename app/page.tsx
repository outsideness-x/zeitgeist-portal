import Link from 'next/link';
import { fetchArticles } from '@/services/content';
import { ArticleCard } from '@/components/ArticleCard';
import { NovaArticlePreviewCard } from '@/components/NovaArticlePreviewCard';
import { EmptyState } from '@/components/EmptyState';
import { resolveCollectionVisualState } from '@/services/content/renderPolicy';

export const dynamic = 'force-dynamic';

const HERO_NAV_ITEMS = [
  { href: '/journal', label: 'ЦИФРОВОЙ ЖУРНАЛ' },
  { href: '/library', label: 'АРХИВ' },
  { href: '/research', label: 'ИССЛЕДОВАНИЯ' },
];

const CURATED_START_HERE_ARTICLES = [
  {
    title: 'Мияби через века: как утонченность Хейан стала глобальным эталоном вкуса',
    sectionLabel: 'Исследования',
    href: '/article/miiabi-chieriez-vieka-kak-utonchiennost-khieian-stala-ghlobalnym-etalonom-vkusa',
  },
  {
    title: 'Исламские учёные и изучение Индии и её культуры',
    sectionLabel: 'Журнал',
    href: '/article/islamskiie-uchionyie-i-izuchieniie-indii-i-ieio-kultury',
  },
  {
    title: 'Ассасины Интерзоны: Как Уильям Берроуз превратил средневековую секту в икону постмодерна',
    sectionLabel: 'Nova Express',
    href: '/article/assasiny-intierzony-kak-uiliam-bierrouz-prievratil-sriednieviekovuiu-siektu-v-ikonu-postmodierna',
  },
] as const;

export default async function Home() {
  // data fetching on server
  const [articlesResult, novaResult] = await Promise.all([
    fetchArticles(undefined, { page: 1, pageSize: 20 }),
    fetchArticles('nova', { page: 1, pageSize: 2 }),
  ]);
  const articles = articlesResult.items;
  const feedState = resolveCollectionVisualState({
    itemsCount: articles.length,
    fetchMeta: articlesResult.fetchMeta,
  });

  const featured = articles[0];
  const journalArticles = articles.filter(a => a.type === 'journal' && a.id !== featured?.id).slice(0, 3);
  const novaDispatches = novaResult.items;

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
                <p className="mt-4 max-w-[29ch] font-serif text-[1.06rem] font-medium leading-[1.74] text-[color:var(--muted-strong)] dark:text-[color:var(--muted-strong)]">
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
                <p className="mt-4 max-w-[30ch] font-serif text-[1.06rem] font-medium leading-[1.74] text-[color:var(--muted-strong)] dark:text-[color:var(--muted-strong)]">
                  Рецензируемые тексты, архивные находки и академические материалы с чистой иерархией.
                </p>
                <span className="mt-auto pt-8 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-strong)] transition-colors group-hover:text-accent dark:text-[color:var(--muted-strong)] dark:group-hover:text-accent">
                  Смотреть каталог
                </span>
              </Link>

              <Link
                href="/nova-express"
                className="group flex h-full min-h-[14.5rem] flex-col rounded-[1.75rem] border border-[color:var(--c-nova-rule)] bg-[linear-gradient(180deg,#232322,#181817)] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--c-nova-text-2)] sm:p-7"
              >
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-[color:var(--c-nova-text-2)]">Nova</p>
                <h2 className="mt-4 max-w-[10ch] font-display text-[clamp(1.58rem,2.15vw,1.95rem)] leading-[1.04] tracking-[-0.03em] text-[color:var(--c-nova-text)]">
                  Nova Express
                </h2>
                <p className="mt-5 max-w-[30ch] font-sans text-[0.98rem] leading-[1.68] text-[color:var(--c-nova-text-2)]">
                  Кибернетика, кат-ап, электронная революция и эстетика сигнала, шума и сбоя.
                </p>
                <span className="mt-auto pt-9 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--c-nova-accent)] transition-colors group-hover:text-[color:var(--c-nova-text)]">
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
                <div className="mb-6 border-b border-[color:var(--line-soft)] pb-4">
                  <p className="section-kicker">редакционный маршрут</p>
                  <h2 className="mt-3 font-display text-[1.8rem] leading-[1] tracking-[-0.035em] text-accent">С чего начать</h2>
                </div>

                <ol className="space-y-6">
                  {CURATED_START_HERE_ARTICLES.map((article) => (
                    <li key={article.href} className="group border-b border-[color:var(--line-soft)] pb-6 last:border-b-0 last:pb-0">
                      <span className="mb-2 block font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                        {article.sectionLabel}
                      </span>
                      <h4 className="font-display text-[1.38rem] leading-[1.12] tracking-[-0.03em] text-ink transition-colors group-hover:text-accent dark:text-gray-100 dark:group-hover:text-accent">
                        <Link href={article.href}>{article.title}</Link>
                      </h4>
                    </li>
                  ))}
                </ol>
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

          <section className="nova-strip mt-20" data-cursor-dark>
            <div aria-hidden="true" className="nova-ambient-grid nova-ambient-grid--panel" />
            <div aria-hidden="true" className="nova-ambient-signal nova-ambient-signal--panel" />
            <div aria-hidden="true" className="nova-ambient-vignette nova-ambient-vignette--panel" />
            <div aria-hidden="true" className="scanlines nova-ambient-scan nova-ambient-scan--panel" />
            <div className="nova-strip-inner">
              <div className="nova-strip-header">
                <span className="nova-eyebrow">Nova Express / Сигнальный поток</span>
                <Link className="nova-link" href="/nova-express">
                  Открыть канал →
                </Link>
              </div>

              <div className="nova-strip-intro">
                <h2 className="nova-title nova-title-signal" data-text="Nova Express">Nova Express</h2>
                <p className="nova-desc">
                  Кибернетика, cut-up, шум, сбой, электронная революция и эстетика сигнального потока.
                </p>
              </div>

              <div className="nova-cards">
                {novaDispatches.length > 0 ? (
                  novaDispatches.map((article) => (
                    <NovaArticlePreviewCard
                      key={article.id}
                      article={article}
                      routePath="/"
                      compact
                    />
                  ))
                ) : (
                  <EmptyState
                    title="nova express синхронизируется"
                    description="как только публикации станут доступны, этот блок автоматически соберет последние передачи канала."
                    className="border-[color:var(--c-nova-rule)] bg-black/35 shadow-none [&>p:first-child]:text-[color:var(--c-nova-accent)] [&>h2]:text-[color:var(--c-nova-text)] [&>p:last-child]:text-[color:var(--c-nova-text-2)]"
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
