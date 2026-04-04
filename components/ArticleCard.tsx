import React from 'react';
import Link from 'next/link';
import { Article } from '@/types';
import { ContentImage } from '@/components/ContentImage';
import { BookmarkButton } from '@/components/BookmarkButton';
import { formatDate } from '@/utils/formatDate';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  routePath?: string;
}

const ARTICLE_TYPE_LABELS: Record<Article['type'], string> = {
  journal: 'Журнал',
  research: 'Исследование',
  nova: 'Nova Express',
};

type ArticleCategory = Article['type'] | 'archive';

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  journal: 'ЖУРНАЛ',
  research: 'ИССЛЕДОВАНИЕ',
  nova: 'NOVA',
  archive: 'АРХИВ',
};

const formatCardTag = (article: Article): string => {
  return `#${CATEGORY_LABELS[article.type] ?? article.type.toUpperCase()}`;
};

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, featured = false, routePath = '/' }) => {
  const isResearch = article.type === 'research';
  const isNova = article.type === 'nova';
  const authorName = article.authors.length > 0
    ? article.authors.map((author) => author.name).join(', ')
    : 'Редакция';
  const formattedDate = formatDate(article.published_at);
  const readingTime = article.reading_time ? `${article.reading_time} мин чтения` : 'Короткое чтение';
  const visualTag = formatCardTag(article);
  const articleTypeLabel = ARTICLE_TYPE_LABELS[article.type];
  const shellClass = isNova
    ? 'article-card article-card--nova'
    : isResearch
      ? 'article-card article-card--research'
      : 'article-card article-card--journal';
  const imageOverlayClass = isNova
    ? 'bg-[linear-gradient(180deg,rgba(5,7,6,0.08),rgba(5,7,6,0.34))]'
    : isResearch
      ? 'bg-[linear-gradient(180deg,rgba(11,14,34,0.06),rgba(11,14,34,0.28))] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.24))]'
      : 'bg-[linear-gradient(180deg,rgba(14,10,9,0.04),rgba(14,10,9,0.24))] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.24))]';
  const imageFallbackClass = isNova
    ? 'flex h-full items-center justify-center bg-[#08110c] px-6 text-center font-sans text-sm uppercase tracking-[0.18em] text-[#9df5c3]'
    : isResearch
      ? 'flex h-full items-center justify-center bg-[#181c2d] px-6 text-center font-sans text-sm uppercase tracking-[0.18em] text-[#dfe4ff] dark:bg-[color:var(--color-surface)] dark:text-[color:var(--foreground)]'
      : 'flex h-full items-center justify-center bg-[#211b18] px-6 text-center font-sans text-sm uppercase tracking-[0.18em] text-[#f8ebdf] dark:bg-[color:var(--color-surface)] dark:text-[color:var(--foreground)]';
  const layoutClass = featured
    ? 'md:grid-cols-[minmax(19rem,0.94fr)_minmax(0,1.06fr)]'
    : 'md:grid-cols-[minmax(15.5rem,0.86fr)_minmax(0,1.14fr)]';
  const mediaClass = featured
    ? 'aspect-[5/4] sm:aspect-[16/11] md:aspect-auto md:min-h-[23rem]'
    : 'aspect-[4/3] sm:aspect-[16/10] md:aspect-auto md:min-h-[18rem]';
  const contentPaddingClass = featured ? 'p-5 sm:p-6 lg:p-7' : 'p-5 sm:p-6 lg:p-6';
  const titleClass = featured
    ? 'text-[clamp(1.7rem,3vw,2.75rem)]'
    : 'text-[clamp(1.32rem,2vw,1.92rem)]';
  const excerptClampClass = featured ? 'line-clamp-4' : 'line-clamp-3';

  return (
    <article
      data-cursor-dark
      data-cursor-hover
      className={`group relative grid overflow-hidden rounded-[clamp(1.5rem,3vw,2rem)] transition-transform duration-300 hover:-translate-y-1 focus-within:-translate-y-1 ${shellClass} ${layoutClass}`}
    >
      <Link
        href={`/article/${article.id}`}
        aria-label={`Открыть материал: ${article.title}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      />

      <div className={`relative overflow-hidden ${mediaClass}`}>
        <ContentImage
          src={article.feature_image}
          alt={article.title}
          route={routePath}
          component="ArticleCard"
          articleId={article.id}
          fill
          priority={featured}
          sizes={featured ? '(max-width: 768px) 100vw, (max-width: 1280px) 54vw, 40vw' : '(max-width: 768px) 100vw, 38vw'}
          fitMode="adaptive"
          surfaceTone="dark"
          className="transition duration-[1.2s] ease-out group-hover:scale-[1.03]"
          fallbackClassName={imageFallbackClass}
          fallbackLabel="обложка недоступна"
        />
        <div className={`absolute inset-0 ${imageOverlayClass}`} />

        <div className="absolute left-4 top-4 z-[1] sm:left-5 sm:top-5">
          <span className="article-card-tag">{visualTag}</span>
        </div>
      </div>

      <div className={`relative flex min-w-0 flex-col ${contentPaddingClass}`}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--article-card-soft)]">
            <span>{articleTypeLabel}</span>
            <span aria-hidden="true" className="opacity-40">/</span>
            <span>{readingTime}</span>
          </div>

          <h3
            className={`mt-4 max-w-[18ch] font-sans font-semibold leading-[1.04] tracking-[-0.04em] text-[color:var(--article-card-text)] ${titleClass}`}
          >
            {article.title}
          </h3>

          <p
            className={`mt-4 max-w-[34rem] text-[0.94rem] leading-[1.68] text-[color:var(--article-card-muted)] ${excerptClampClass}`}
          >
            {article.excerpt}
          </p>
        </div>

        <div className="relative z-20 mt-7 flex items-end justify-between gap-4 border-t border-[color:var(--article-card-meta-border)] pt-5">
          <div className="min-w-0">
            <p className="truncate font-sans text-[0.98rem] font-semibold leading-tight text-[color:var(--article-card-text)]">
              {authorName}
            </p>
            <p className="mt-1 truncate font-sans text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--article-card-soft)]">
              {formattedDate}
            </p>
          </div>

          <div className="relative z-20 shrink-0">
            <BookmarkButton
              variant="card"
              article={{
                id: article.id,
                source: article.source,
                externalId: article.externalId,
                slug: article.slug,
                canonicalPath: article.canonicalPath,
                title: article.title,
                excerpt: article.excerpt,
                feature_image: article.feature_image,
                type: article.type,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
};
