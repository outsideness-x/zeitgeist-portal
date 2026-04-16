import Link from 'next/link';
import type { Article } from '@/types';
import { ContentImage } from '@/components/ContentImage';
import { formatDate } from '@/utils/formatDate';

type NovaArticlePreviewCardProps = {
  article: Article;
  routePath: string;
  compact?: boolean;
};

export function NovaArticlePreviewCard({ article, routePath, compact = false }: NovaArticlePreviewCardProps) {
  const href = article.canonicalPath ?? `/article/${article.id}`;
  const readingTime = article.reading_time ? `${article.reading_time} мин` : 'короткий сигнал';
  const visibleTags = article.tags
    .filter((tag) => tag.toLowerCase() !== 'nova')
    .slice(0, 3);

  return (
    <Link
      href={href}
      className={`nova-card group ${compact ? 'nova-card--compact' : ''}`}
      aria-label={`Открыть публикацию: ${article.title}`}
    >
      <div className="nova-card-media">
        <ContentImage
          src={article.feature_image}
          alt={article.title}
          route={routePath}
          component="NovaArticlePreviewCard"
          articleId={article.id}
          fill
          sizes={compact
            ? '(max-width: 768px) 100vw, (max-width: 1280px) 48vw, 24vw'
            : '(max-width: 768px) 100vw, (max-width: 1280px) 82vw, 66vw'}
          fitMode="adaptive"
          surfaceTone="dark"
          className="nova-card-image transition duration-[1.1s] ease-out group-hover:scale-[1.03]"
          fallbackClassName="nova-card-media-fallback"
          fallbackLabel="изображение недоступно"
        />
        <div className="nova-card-media-overlay" aria-hidden="true" />
      </div>

      <div className="nova-card-body">
        <p className="nova-card-meta">
          {formatDate(article.published_at)} · {readingTime}
        </p>
        <h3 className="nova-card-title">{article.title}</h3>
        <p className="nova-card-excerpt">{article.excerpt}</p>
        {visibleTags.length > 0 ? (
          <div className="nova-card-tags" aria-label="Теги публикации">
            {visibleTags.map((tag) => (
              <span key={tag} className="nova-card-tag">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
