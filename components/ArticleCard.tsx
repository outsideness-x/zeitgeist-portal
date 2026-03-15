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
  const titleSizeClass = featured ? 'text-3xl md:text-5xl' : 'text-3xl md:text-4xl';

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'research': return 'bg-indigo-900/75 text-white';
      case 'nova': return 'bg-black/75 text-green-300';
      default: return 'bg-accent/85 text-white';
    }
  };

  return (
    <Link
      href={`/article/${article.id}`}
      className="group relative block h-[400px] overflow-hidden rounded-2xl bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-colors duration-500 group-hover:from-black/95 group-hover:via-black/35" />

      <div className="absolute left-0 top-0 p-6">
        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-sans uppercase tracking-[0.18em] ${getBadgeColor(article.type)}`}>
          {article.type === 'nova' ? 'Nova Express' : article.type === 'research' ? 'исследование' : 'журнал'}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-8 text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-sans uppercase tracking-[0.18em] text-gray-300">
          <span>{formattedDate}</span>
          <span>&bull;</span>
          <span>{readingTime}</span>
        </div>

        <h3 className={`${titleSizeClass} font-display leading-[0.95] tracking-tight text-white`}>
          {article.title}
        </h3>

        <p className="mt-3 text-sm font-sans italic text-gray-300">
          Автор: <span className="not-italic font-semibold text-white">{authorName}</span>
        </p>

        <p className="mt-4 max-w-2xl font-serif text-lg font-medium leading-relaxed text-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 line-clamp-3">
          {article.excerpt}
        </p>
      </div>
    </Link>
  );
};
