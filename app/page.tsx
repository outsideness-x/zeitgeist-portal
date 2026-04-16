import Link from 'next/link';
import { fetchArticleById, fetchArticles } from '@/services/content';
import { NovaArticlePreviewCard } from '@/components/NovaArticlePreviewCard';
import { ContentImage } from '@/components/ContentImage';
import { EmptyState } from '@/components/EmptyState';
import { resolveCollectionVisualState } from '@/services/content/renderPolicy';
import { formatDate } from '@/utils/formatDate';

export const dynamic = 'force-dynamic';

const CURATED_START_HERE_ARTICLES = [
  {
    title: 'Мияби через века: как утонченность Хейан стала глобальным эталоном вкуса',
    sectionLabel: 'Исследования',
    slug: 'miiabi-chieriez-vieka-kak-utonchiennost-khieian-stala-ghlobalnym-etalonom-vkusa',
    fallbackDek: 'Историческая траектория эстетики мияби и ее современного резонанса.',
  },
  {
    title: 'Исламские учёные и изучение Индии и её культуры',
    sectionLabel: 'Журнал',
    slug: 'islamskiie-uchionyie-i-izuchieniie-indii-i-ieio-kultury',
    fallbackDek: 'О трансрегиональной интеллектуальной истории и ранних описаниях индийского мира.',
  },
  {
    title: 'Ассасины Интерзоны: Как Уильям Берроуз превратил средневековую секту в икону постмодерна',
    sectionLabel: 'Nova Express',
    slug: 'assasiny-intierzony-kak-uiliam-bierrouz-prievratil-sriednieviekovuiu-siektu-v-ikonu-postmodierna',
    fallbackDek: 'Как литературный монтаж Берроуза переизобрел образ ассасинов в культуре XX века.',
  },
] as const;

const resolveArticlePath = (slug: string, canonicalPath?: string) => {
  const normalizedPath = canonicalPath?.trim();
  if (normalizedPath) {
    return normalizedPath;
  }
  return `/article/${slug}`;
};

const buildArticleKey = (article: { canonicalPath?: string; slug?: string; id?: string }) => {
  return (
    article.canonicalPath?.trim()
    || article.slug?.trim()
    || article.id?.trim()
    || ''
  ).toLowerCase();
};

const resolveStartDek = (excerpt: string | undefined, fallbackDek: string) => {
  const maxLength = 190;
  const normalizedExcerpt = excerpt?.replace(/\s+/g, ' ').trim();
  const normalizedFallback = fallbackDek.replace(/\s+/g, ' ').trim();
  const source = normalizedExcerpt || normalizedFallback;

  if (source.length <= maxLength) {
    return source;
  }

  return `${source.slice(0, maxLength - 1).trimEnd()}…`;
};

export default async function Home() {
  const [curatedArticles, novaResult, researchResult] = await Promise.all([
    Promise.all(CURATED_START_HERE_ARTICLES.map((item) => fetchArticleById(item.slug))),
    fetchArticles('nova', { page: 1, pageSize: 2 }),
    fetchArticles('research', { page: 1, pageSize: 8 }),
  ]);

  const startCards = CURATED_START_HERE_ARTICLES.map((item, index) => {
    const article = curatedArticles[index];
    const coverImage = article?.feature_image?.trim()
      ? article.feature_image
      : '/course-cover.png';

    return {
      ...item,
      article,
      href: resolveArticlePath(item.slug, article?.canonicalPath),
      dek: resolveStartDek(article?.excerpt, item.fallbackDek),
      coverImage,
    };
  });
  const usedResearchKeys = new Set(
    startCards
      .filter((item) => item.article?.type === 'research')
      .map((item) => buildArticleKey(item.article!))
      .filter(Boolean),
  );
  const dedupedResearchItems = researchResult.items
    .filter((item) => !usedResearchKeys.has(buildArticleKey(item)))
    .slice(0, 3);
  const researchItems = dedupedResearchItems.length > 0
    ? dedupedResearchItems
    : researchResult.items.slice(0, 3);

  const novaState = resolveCollectionVisualState({
    itemsCount: novaResult.items.length,
    fetchMeta: novaResult.fetchMeta,
  });
  const researchState = resolveCollectionVisualState({
    itemsCount: researchResult.items.length,
    fetchMeta: researchResult.fetchMeta,
  });

  return (
    <div className="pb-24 dark:bg-[color:var(--color-canvas)]">
      <div className="page-wrap">
        <section className="home-intro">
          <div className="home-intro__content">
            <p className="home-intro__lead">
              &laquo;Zeitgeist&raquo; — это платформа публикации и развития независимых исследований, объединяющая авторов из разных областей знания.
            </p>
            <p className="home-intro__sublead">
              ДЛЯ ИССЛЕДОВАТЕЛЕЙ, ЧИТАТЕЛЕЙ И ТЕХ, КОМУ ВАЖНА ДОЛГОВЕЧНАЯ ИНТЕЛЛЕКТУАЛЬНАЯ СРЕДА.
            </p>
          </div>
        </section>

        <section aria-label="Основные разделы Zeitgeist">
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
        </section>

        <section className="start-section" id="start-here">
          <div className="start-header">
            <span className="section-eyebrow">С чего начать</span>
            <p className="start-desc">Три материала, с которых удобнее всего начать знакомство с проектом</p>
          </div>
          <div className="start-grid">
            {startCards.map((article, index) => (
              <article className="start-card" key={article.slug}>
                <span className="start-num">{`${index + 1}`.padStart(2, '0')}</span>
                <Link className="start-cover-link" href={article.href} aria-label={`Открыть материал: ${article.title}`}>
                  <div className="start-cover-media">
                    <ContentImage
                      src={article.coverImage}
                      alt={article.title}
                      route="/"
                      component="HomeStartCard"
                      articleId={article.article?.id ?? article.slug}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 32vw, 380px"
                      fitMode="cover"
                      surfaceTone="light"
                      className="start-cover"
                      fallbackClassName="start-cover-fallback"
                      fallbackLabel="изображение недоступно"
                    />
                  </div>
                </Link>
                <Link className="start-title" href={article.href}>
                  {article.title}
                </Link>
                <p className="start-dek">{article.dek}</p>
                <span className="start-tag">{article.sectionLabel}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="nova-strip" data-cursor-dark>
          <div className="nova-strip-inner">
            <div className="nova-strip-header">
              <span className="nova-eyebrow">Nova Express / Заметки об андеграундной культуре</span>
              <Link className="nova-link" href="/nova-express">
                Открыть канал →
              </Link>
            </div>

            <div className="nova-cards">
              {novaResult.items.length > 0 ? (
                novaResult.items.map((article) => (
                  <NovaArticlePreviewCard
                    key={article.id}
                    article={article}
                    routePath="/"
                    compact
                  />
                ))
              ) : novaState === 'error' ? (
                <EmptyState
                  title="nova express временно недоступен"
                  description="ghost временно не отвечает, и блок обновится автоматически после восстановления."
                  className="border-[color:var(--c-nova-rule)] bg-black/35 shadow-none [&>p:first-child]:text-[color:var(--c-nova-accent)] [&>h2]:text-[color:var(--c-nova-text)] [&>p:last-child]:text-[color:var(--c-nova-text-2)]"
                />
              ) : (
                <EmptyState
                  title="nova express синхронизируется"
                  description="первые карточки появятся сразу после получения публикаций."
                  className="border-[color:var(--c-nova-rule)] bg-black/35 shadow-none [&>p:first-child]:text-[color:var(--c-nova-accent)] [&>h2]:text-[color:var(--c-nova-text)] [&>p:last-child]:text-[color:var(--c-nova-text-2)]"
                />
              )}
            </div>
          </div>
          <div className="nova-scanline" aria-hidden="true" />
        </section>

        <section className="research-strip">
          <div className="feed-header">
            <span className="section-eyebrow">Последние исследования</span>
            <Link className="section-link" href="/research">
              Каталог →
            </Link>
          </div>

          {researchItems.length > 0 ? (
            <div className="research-list">
              {researchItems.map((item) => (
                <article key={item.id} className="research-item">
                  <Link className="research-title" href={item.canonicalPath ?? `/article/${item.id}`}>
                    {item.title}
                  </Link>
                  <p className="research-meta">
                    {formatDate(item.published_at)}
                    {item.reading_time ? ` · ${item.reading_time} мин` : ''}
                  </p>
                </article>
              ))}
            </div>
          ) : researchState === 'error' ? (
            <EmptyState
              title="исследования временно недоступны"
              description="не удалось загрузить продолжение каталога, попробуйте обновить страницу немного позже."
            />
          ) : (
            <EmptyState
              title="раздел исследований готовится"
              description="новые материалы появятся после синхронизации с Ghost."
            />
          )}
        </section>

        <section className="support-quiet">
          <Link href="/donate">Поддержать проект →</Link>
        </section>
      </div>
    </div>
  );
}
