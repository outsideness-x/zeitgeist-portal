import React from 'react';
import Link from 'next/link';
import { Article } from '@/types';
import { ContentImage } from '@/components/ContentImage';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  routePath?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, featured = false, routePath = '/' }) => {
  const authorName = article.authors.length > 0
    ? article.authors.map((author) => author.name).join(', ')
    : 'Редакция';
  const formattedDate = new Date(article.published_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const readingTime = article.reading_time ? `${article.reading_time} мин чтения` : 'Короткое чтение';
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'research': return 'bg-indigo-900/75 text-white';
      case 'nova': return 'bg-black/75 text-green-300';
      default: return 'bg-accent/85 text-white';
    }
  };
  const titleSizeClass = featured
    ? 'text-[clamp(1.9rem,7.8vw,2.8rem)] leading-[0.98] tracking-tight text-balance line-clamp-3 md:text-[clamp(2.15rem,4.35vw,3.75rem)] md:leading-[1.02] md:line-clamp-4'
    : 'text-[clamp(1.55rem,6.8vw,2.15rem)] leading-[1] tracking-tight text-balance line-clamp-3 md:text-[clamp(1.8rem,3vw,2.6rem)] md:leading-[1.02]';
  const titleLayoutClass = featured
    ? 'max-w-[94%] pt-[0.08em] md:max-w-[82%]'
    : 'max-w-[94%] pt-[0.06em]';
  const containerClass = featured
    ? 'h-[520px] sm:h-[560px] md:h-[520px] rounded-2xl bg-black'
    : 'h-[440px] sm:h-[460px] md:h-[420px] rounded-2xl bg-black';
  const overlayClass = 'bg-gradient-to-t from-black via-black/60 to-black/10 transition-colors duration-500 md:via-black/35 md:to-transparent group-hover:from-black md:group-hover:via-black/50';
  const contentClass = 'absolute bottom-0 left-0 w-full p-4 text-white transition-transform duration-500 sm:p-6 md:p-8';
  const excerptClass = featured
    ? 'mt-3 hidden max-w-3xl font-serif text-sm leading-relaxed text-gray-100 line-clamp-3 md:mt-4 md:block md:text-lg md:opacity-0 md:transition-opacity md:duration-500 md:delay-100 md:group-hover:opacity-100'
    : 'mt-3 hidden max-w-2xl font-serif text-sm leading-relaxed text-gray-100 line-clamp-3 md:mt-4 md:block md:text-base md:opacity-0 md:transition-opacity md:duration-500 md:delay-100 md:group-hover:opacity-100';
  const titleFontClass = 'font-serif font-semibold';
  const authorClass = 'mt-2 text-xs font-sans italic text-gray-300 sm:text-sm md:mt-3';
  const metaClass = 'mb-2 flex flex-col items-start gap-1 text-[10px] font-sans uppercase tracking-[0.14em] text-gray-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:text-[11px] sm:tracking-[0.18em] md:mb-3';
  const badgeClass = `inline-flex rounded-full px-3 py-1 text-[10px] font-sans uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.18em] ${getBadgeColor(article.type)}`;

  return (
    <Link
      href={`/article/${article.id}`}
      className={`group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${containerClass}`}
    >
      <ContentImage
        src={article.feature_image}
        alt={article.title}
        route={routePath}
        component="ArticleCard"
        articleId={article.id}
        fill
        priority={featured}
        sizes={featured ? '(max-width: 768px) 100vw, 80vw' : '(max-width: 768px) 100vw, 50vw'}
        className="object-cover grayscale transition duration-[1.5s] ease-out group-hover:scale-110 group-hover:grayscale-0"
        fallbackLabel="обложка недоступна"
      />

      <div className={`absolute inset-0 ${overlayClass}`} />
      <div className="absolute left-0 top-0 p-4 sm:p-6">
        <span className={badgeClass}>
          {article.type === 'nova' ? 'Nova Express' : article.type === 'research' ? 'исследование' : 'журнал'}
        </span>
      </div>

      <div className={contentClass}>
        <div className={metaClass}>
          <span>{formattedDate}</span>
          <span className="hidden sm:inline">&bull;</span>
          <span>{readingTime}</span>
        </div>

        <h3 className={`${titleSizeClass} ${titleLayoutClass} ${titleFontClass} text-white`}>
          {article.title}
        </h3>

        <p className={authorClass}>
          Автор: <span className="not-italic font-semibold text-white">{authorName}</span>
        </p>

        <p className={excerptClass}>
          {article.excerpt}
        </p>
      </div>
    </Link>
  );
};
