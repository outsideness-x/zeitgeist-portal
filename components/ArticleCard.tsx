import React from 'react';
import Link from 'next/link';
import { Article } from '@/types';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, featured = false }) => {
  // beidge badge color based on type
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'research': return 'bg-indigo-900';
      case 'nova': return 'bg-black text-green-400 border border-green-400'; // Киберпанк стиль
      default: return 'bg-accent text-white';
    }
  };

  return (
    <div className={`group flex flex-col ${featured ? 'md:grid md:grid-cols-2 md:gap-8 mb-12' : 'h-full'}`}>
      
      {/* Image Container */}
      <div className={`relative overflow-hidden bg-sepia ${featured ? 'h-64 md:h-96' : 'h-64'} mb-4 md:mb-0`}>
        <img 
          src={article.feature_image} 
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale-[20%] group-hover:grayscale-0"
          loading="lazy"
        />
        <div className="absolute top-4 left-4">
          <span className={`inline-block px-3 py-1 text-xs font-sans uppercase tracking-widest ${getBadgeColor(article.type)}`}>
            {article.type === 'nova' ? 'NOVA EXPRESS' : article.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col justify-center ${featured ? 'md:pr-8' : ''}`}>
        <div className="flex items-center space-x-2 text-xs font-sans font-bold text-gray-500 uppercase tracking-wider mb-3">
          <span>{new Date(article.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>&bull;</span>
          <span>{article.reading_time} min read</span>
        </div>

        <h3 className={`${featured ? 'text-3xl md:text-4xl' : 'text-2xl'} font-display leading-tight mb-3 group-hover:text-accent transition-colors`}>
          <Link href={`/article/${article.id}`}>
            {article.title}
          </Link>
        </h3>

        <div className="w-12 h-1 bg-accent mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <p className="font-serif text-gray-600 leading-relaxed mb-4 line-clamp-3">
          {article.excerpt}
        </p>

        <div className="mt-auto">
          <p className="text-sm font-sans italic text-gray-500">By <span className="text-ink not-italic font-bold">{article.authors[0].name}</span></p>
        </div>
      </div>
    </div>
  );
};