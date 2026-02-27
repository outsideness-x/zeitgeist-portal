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
      case 'research': return 'bg-indigo-900 text-white';
      case 'nova': return 'bg-black text-green-400 border border-green-400';
      default: return 'bg-accent text-white';
    }
  };

  return (
    <div className={`group flex flex-col rounded-lg ${featured ? 'md:grid md:grid-cols-2 md:gap-8' : ''}`}>
      <Link href={`/article/${article.id}`} className={`relative overflow-hidden rounded-lg bg-sepia ${featured ? 'h-64 md:h-96' : 'h-64'} mb-6 md:mb-0 block`}>
        <ContentImage
          src={article.feature_image}
          alt={article.title}
          route={routePath}
          component="ArticleCard"
          articleId={article.id}
          fill
          priority={featured}
          sizes={featured ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
          className="object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale-[20%] group-hover:grayscale-0"
          fallbackLabel="обложка недоступна"
        />
        <div className="absolute top-4 left-4">
          <span className={`inline-block px-3 py-1 text-xs font-sans uppercase tracking-widest ${getBadgeColor(article.type)}`}>
            {article.type === 'nova' ? 'Nova Express' : article.type === 'research' ? 'исследование' : 'журнал'}
          </span>
        </div>
      </Link>

      <div className={`flex flex-col gap-3 ${featured ? 'md:pr-8' : ''}`}>
        <div className="flex items-center space-x-2 text-xs font-sans font-bold text-gray-500 uppercase tracking-wider">
          <span>{formattedDate}</span>
          <span>&bull;</span>
          <span>{readingTime}</span>
        </div>

        <h3 className={`${featured ? 'text-3xl md:text-4xl' : 'text-2xl'} font-display leading-tight group-hover:text-accent dark:group-hover:text-white transition-colors`}>
          <Link href={`/article/${article.id}`}>
            {article.title}
          </Link>
        </h3>

        <div className="w-12 h-1 bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <p className="font-serif text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
          {article.excerpt}
        </p>

        <p className="text-sm font-sans italic text-gray-500">Автор: <span className="text-ink dark:text-gray-300 not-italic font-bold">{authorName}</span></p>
      </div>
    </div>
  );
};
