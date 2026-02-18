"use client";

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { backendRequest } from '@/services/backend/client';

type LikeButtonProps = {
  article: {
    id: string;
    source?: 'local' | 'ghost';
    externalId?: string;
    slug?: string;
    canonicalPath?: string;
    title: string;
    excerpt: string;
    feature_image?: string;
    type: 'journal' | 'research' | 'nova';
  };
  baseCount?: number;
};

type EnsureArticleResponse = {
  articleId: string;
};

type ReactionSummaryResponse = {
  likeCount: number;
  viewer: {
    liked: boolean;
  };
};

export const LikeButton = ({ article, baseCount = 0 }: LikeButtonProps): JSX.Element => {
  const { user, csrfToken } = useAuth();
  const [internalArticleId, setInternalArticleId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.max(0, baseCount));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const ensurePayload = useMemo(() => ({
    source: article.source === 'local' ? 'local' : 'ghost',
    externalId: article.externalId?.trim() ? article.externalId : undefined,
    slug: article.slug?.trim() || article.id,
    title: article.title,
    excerpt: article.excerpt,
    section: article.type,
    canonicalPath: article.canonicalPath?.trim() || `/article/${article.slug?.trim() || article.id}`,
    featureImage: article.feature_image,
  }), [article]);

  useEffect(() => {
    let active = true;

    const syncLikeState = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const ensured = await backendRequest<EnsureArticleResponse>({
          path: '/api/articles/ensure',
          method: 'POST',
          body: ensurePayload,
        });

        if (!active) {
          return;
        }

        setInternalArticleId(ensured.articleId);

        const summary = await backendRequest<ReactionSummaryResponse>({
          path: `/api/articles/${ensured.articleId}/reactions`,
        });

        if (!active) {
          return;
        }

        setLikeCount(summary.likeCount);
        setLiked(summary.viewer.liked);
      } catch (error) {
        if (!active) {
          return;
        }

        setInternalArticleId(null);
        setLikeCount(Math.max(0, baseCount));
        setLiked(false);
        setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить лайки');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void syncLikeState();

    return () => {
      active = false;
    };
  }, [baseCount, ensurePayload, user?.id]);

  const handleToggle = async (): Promise<void> => {
    if (!internalArticleId || isSubmitting || isLoading) {
      return;
    }

    if (!user || !csrfToken) {
      setErrorMessage('войдите, чтобы ставить лайки');
      return;
    }

    const previousLiked = liked;
    const previousLikeCount = likeCount;
    const nextLiked = !previousLiked;
    const nextLikeCount = Math.max(0, previousLikeCount + (nextLiked ? 1 : -1));

    setErrorMessage('');
    setLiked(nextLiked);
    setLikeCount(nextLikeCount);
    setIsSubmitting(true);

    try {
      const summary = await backendRequest<ReactionSummaryResponse>({
        path: `/api/articles/${internalArticleId}/like`,
        method: nextLiked ? 'POST' : 'DELETE',
        csrfToken,
      });

      setLiked(summary.viewer.liked);
      setLikeCount(summary.likeCount);
    } catch (error) {
      setLiked(previousLiked);
      setLikeCount(previousLikeCount);
      setErrorMessage(error instanceof Error ? error.message : 'не удалось обновить лайк');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={isLoading || isSubmitting}
        aria-label={liked ? 'убрать лайк' : 'поставить лайк'}
        aria-pressed={liked}
        className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md p-2 text-sm transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
          liked
            ? 'text-accent dark:text-accent'
            : 'text-ink dark:text-gray-300'
        }`}
      >
        <span className="inline-flex h-11 w-11 items-center justify-center" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12.62 20.2a1 1 0 0 1-1.24 0C7.43 17.1 4 14.37 4 10.47A4.47 4.47 0 0 1 8.47 6c1.38 0 2.7.64 3.53 1.73A4.45 4.45 0 0 1 15.53 6 4.47 4.47 0 0 1 20 10.47c0 3.9-3.43 6.63-7.38 9.73Z"
            />
          </svg>
        </span>
        <span className="font-sans text-xs uppercase tracking-wider">{likeCount}</span>
      </button>
      {errorMessage && (
        <p className="max-w-56 text-right font-sans text-[10px] uppercase tracking-wider text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
