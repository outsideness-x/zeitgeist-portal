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
  const isResearch = article.type === 'research';
  const isNova = article.type === 'nova';
  const authorName = article.authors.length > 0
    ? article.authors.map((author) => author.name).join(', ')
    : 'Редакция';
  const formattedDate = new Date(article.published_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const readingTime = article.reading_time ? `${article.reading_time} мин чтения` : 'Короткое чтение';

  const shellClass = isNova
    ? 'border border-[#58f29d]/16 bg-[#060807] text-[#effff4] shadow-[0_0_0_1px_rgba(88,242,157,0.04),0_30px_75px_rgba(0,0,0,0.32)]'
    : isResearch
      ? 'border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-ink shadow-[var(--shadow-soft)] dark:bg-[#17151f] dark:text-gray-100'
      : 'border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-ink shadow-[var(--shadow-soft)]';

  const imageOverlayClass = isNova
    ? 'bg-gradient-to-t from-[#050706]/74 via-[#09130d]/28 to-transparent'
    : isResearch
      ? 'bg-gradient-to-t from-[#151325]/48 via-[#151325]/10 to-transparent'
      : 'bg-gradient-to-t from-[#120e0c]/34 via-[#120e0c]/8 to-transparent';

  const badgeClass = isNova
    ? 'inline-flex max-w-full items-center justify-center rounded-full border border-[#58f29d]/28 bg-[#07110c] px-3 py-1 text-center font-mono text-[0.68rem] uppercase leading-tight tracking-[0.16em] text-[#a4ffca]'
    : isResearch
      ? 'inline-flex max-w-full items-center justify-center rounded-full bg-[#232048] px-3 py-1 text-center font-sans text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.16em] text-[#f1efff]'
      : 'inline-flex max-w-full items-center justify-center rounded-full bg-accent px-3 py-1 text-center font-sans text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.16em] text-white';

  const metaClass = isNova
    ? 'break-words font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[#bfffd7]/70'
    : 'break-words font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]';

  const titleClass = featured
    ? 'font-serif text-[clamp(1.7rem,4.8vw,3rem)] leading-[1.08] tracking-[-0.03em]'
    : 'font-serif text-[clamp(1.28rem,3.8vw,2.05rem)] leading-[1.08] tracking-[-0.025em]';

  const excerptClass = isNova
    ? 'mt-4 line-clamp-4 max-w-2xl font-serif text-[0.98rem] leading-relaxed text-[#d8ffe7]/78'
    : 'mt-4 line-clamp-4 max-w-2xl font-serif text-[0.98rem] leading-relaxed text-[color:var(--muted)] dark:text-gray-400';

  const authorClass = isNova
    ? 'mt-5 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#bfffd7]/72'
    : 'mt-5 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]';

  return (
    <Link
      href={`/article/${article.id}`}
      className={`group block min-w-0 max-w-full overflow-hidden rounded-[clamp(1.35rem,3vw,1.75rem)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${shellClass}`}
    >
      <article className={featured ? 'flex flex-col lg:grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]' : 'flex flex-col'}>
        <div className={`relative min-w-0 overflow-hidden ${featured ? 'aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[24rem]' : 'aspect-[16/10]'}`}>
          <ContentImage
            src={article.feature_image}
            alt={article.title}
            route={routePath}
            component="ArticleCard"
            articleId={article.id}
            fill
            priority={featured}
            sizes={featured ? '(max-width: 1024px) 100vw, 52vw' : '(max-width: 768px) 100vw, 50vw'}
            fitMode="adaptive"
            surfaceTone={isNova ? 'dark' : 'light'}
            className="transition duration-[1.1s] ease-out group-hover:scale-[1.02]"
            fallbackClassName={`flex h-full items-center justify-center px-6 text-center font-sans text-sm uppercase tracking-[0.18em] ${
              isNova ? 'bg-[#07110c] text-[#95ffbf]' : 'bg-sepia text-[color:var(--muted)] dark:bg-card-bg'
            }`}
            fallbackLabel="обложка недоступна"
          />
          <div className={`absolute inset-0 ${imageOverlayClass}`} />
        </div>

        <div className={`min-w-0 p-4 sm:p-5 ${featured ? 'sm:p-6 lg:p-8' : 'md:p-6'}`}>
          <div className="flex flex-wrap items-center gap-2 gap-y-3">
            <span className={badgeClass}>
              {article.type === 'nova' ? 'Nova Express' : article.type === 'research' ? 'исследование' : 'журнал'}
            </span>
            <span className={metaClass}>{formattedDate}</span>
            <span className={`hidden sm:inline ${metaClass}`} aria-hidden="true">&bull;</span>
            <span className={metaClass}>{readingTime}</span>
          </div>

          <h3 className={`${titleClass} mt-4 max-w-[22ch] break-words text-balance ${isNova ? 'text-[#f3fff7]' : 'text-ink dark:text-gray-100'}`}>
            {article.title}
          </h3>

          <p className={excerptClass}>
            {article.excerpt}
          </p>

          <p className={authorClass}>
            Автор: <span className={isNova ? 'text-[#effff4]' : 'text-ink dark:text-gray-100'}>{authorName}</span>
          </p>
        </div>
      </article>
    </Link>
  );
};
