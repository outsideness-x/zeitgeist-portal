"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { backendRequest } from '@/services/backend/client';

type ReactionType = 'like' | 'insightful' | 'celebrate';

type EnsureResponse = {
  articleId: string;
};

type EngagementResponse = {
  bookmarkCount: number;
  reactionCounts: Record<string, number>;
  totalViews: number;
  totalUniqueVisitors: number;
};

type Props = {
  source: 'local' | 'ghost';
  slug: string;
  externalId?: string;
  title: string;
  excerpt: string;
  section: 'journal' | 'research' | 'nova';
  initialInternalArticleId?: string;
};

const reactionLabels: Record<ReactionType, string> = {
  like: 'полезно',
  insightful: 'глубоко',
  celebrate: 'сильно',
};

export const ArticleEngagement = (props: Props) => {
  const { user, csrfToken } = useAuth();
  const [internalArticleId, setInternalArticleId] = useState<string | null>(props.initialInternalArticleId ?? null);
  const [engagement, setEngagement] = useState<EngagementResponse | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const viewSentRef = useRef<string | null>(null);

  const ensureArticle = async () => {
    if (internalArticleId) {
      return internalArticleId;
    }

    const ensured = await backendRequest<EnsureResponse>({
      path: '/api/articles/ensure',
      method: 'POST',
      body: {
        source: props.source,
        slug: props.slug,
        externalId: props.externalId,
        title: props.title,
        excerpt: props.excerpt,
        section: props.section,
        canonicalPath: `/article/${props.slug}`,
      },
    });

    setInternalArticleId(ensured.articleId);
    return ensured.articleId;
  };

  const loadEngagement = async (articleId: string) => {
    const summary = await backendRequest<EngagementResponse>({
      path: `/api/articles/${articleId}/engagement`,
    });
    setEngagement(summary);
  };

  const loadMyState = async (articleId: string) => {
    if (!user) {
      setBookmarked(false);
      setMyReaction(null);
      return;
    }

    const [bookmarkResponse, reactionResponse] = await Promise.all([
      backendRequest<{ bookmarked: boolean }>({
        path: `/api/articles/${articleId}/bookmark/me`,
      }),
      backendRequest<{ reaction: ReactionType | null }>({
        path: `/api/articles/${articleId}/reaction/me`,
      }),
    ]);

    setBookmarked(bookmarkResponse.bookmarked);
    setMyReaction(reactionResponse.reaction);
  };

  useEffect(() => {
    // this lazy ensure call binds page-level content to the internal article registry before tracking events
    const run = async () => {
      try {
        const articleId = await ensureArticle();
        await loadEngagement(articleId);
        await loadMyState(articleId);

        // this sends one view per page load and relies on backend visitor dedup for unique visitor counts
        if (viewSentRef.current !== articleId) {
          await backendRequest({
            path: '/api/analytics/view',
            method: 'POST',
            body: {
              articleId,
            },
          });
          viewSentRef.current = articleId;
          await loadEngagement(articleId);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить метрики статьи');
      }
    };

    void run();
    // this effect runs only on mount for the current article props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.slug]);

  useEffect(() => {
    if (!internalArticleId) {
      return;
    }
    void loadMyState(internalArticleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, internalArticleId]);

  const handleBookmarkToggle = async () => {
    if (!user || !csrfToken) {
      setErrorMessage('войдите, чтобы управлять закладками');
      return;
    }
    if (!internalArticleId) {
      return;
    }

    setBusy(true);
    setErrorMessage('');
    try {
      const response = await backendRequest<{ bookmarked: boolean; bookmarkCount: number }>({
        path: '/api/me/bookmarks/toggle',
        method: 'POST',
        csrfToken,
        body: { articleId: internalArticleId },
      });

      setBookmarked(response.bookmarked);
      setEngagement((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          bookmarkCount: response.bookmarkCount,
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось обновить закладку');
    } finally {
      setBusy(false);
    }
  };

  const handleReactionSet = async (reaction: ReactionType) => {
    if (!user || !csrfToken) {
      setErrorMessage('войдите, чтобы оставить реакцию');
      return;
    }
    if (!internalArticleId) {
      return;
    }

    setBusy(true);
    setErrorMessage('');
    try {
      if (myReaction === reaction) {
        await backendRequest({
          path: `/api/articles/${internalArticleId}/reaction`,
          method: 'DELETE',
          csrfToken,
        });
        setMyReaction(null);
      } else {
        const response = await backendRequest<{ reaction: ReactionType }>({
          path: `/api/articles/${internalArticleId}/reaction`,
          method: 'POST',
          csrfToken,
          body: { type: reaction },
        });
        setMyReaction(response.reaction);
      }

      await loadEngagement(internalArticleId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось сохранить реакцию');
    } finally {
      setBusy(false);
    }
  };

  const handlePdfDownload = async () => {
    if (!internalArticleId) {
      return;
    }
    if (!user) {
      setErrorMessage('войдите, чтобы скачать pdf');
      return;
    }

    setBusy(true);
    setErrorMessage('');
    try {
      const response = await backendRequest<{ url: string }>({
        path: `/api/articles/${internalArticleId}/download`,
      });
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось получить ссылку на pdf');
    } finally {
      setBusy(false);
    }
  };

  const reactionTotals = useMemo(() => {
    return {
      like: engagement?.reactionCounts.like ?? 0,
      insightful: engagement?.reactionCounts.insightful ?? 0,
      celebrate: engagement?.reactionCounts.celebrate ?? 0,
    };
  }, [engagement]);

  return (
    <div className="mt-10 border border-sepia bg-sepia/20 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span>просмотры: {engagement?.totalViews ?? 0}</span>
        <span>уникальные: {engagement?.totalUniqueVisitors ?? 0}</span>
        <span>закладки: {engagement?.bookmarkCount ?? 0}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleBookmarkToggle()}
          disabled={busy || !internalArticleId}
          className={`border px-3 py-2 text-xs uppercase tracking-wider ${bookmarked ? 'border-accent bg-accent text-white' : 'border-sepia hover:border-accent'} disabled:opacity-50`}
        >
          {bookmarked ? 'в закладках' : 'в закладки'}
        </button>

        {(Object.keys(reactionLabels) as ReactionType[]).map((reaction) => (
          <button
            key={reaction}
            type="button"
            onClick={() => void handleReactionSet(reaction)}
            disabled={busy || !internalArticleId}
            className={`border px-3 py-2 text-xs uppercase tracking-wider ${myReaction === reaction ? 'border-accent bg-accent text-white' : 'border-sepia hover:border-accent'} disabled:opacity-50`}
          >
            {reactionLabels[reaction]} ({reactionTotals[reaction]})
          </button>
        ))}

        {props.section === 'research' && (
          <button
            type="button"
            onClick={() => void handlePdfDownload()}
            disabled={busy || !internalArticleId}
            className="border border-sepia px-3 py-2 text-xs uppercase tracking-wider hover:border-accent disabled:opacity-50"
          >
            скачать pdf
          </button>
        )}
      </div>

      {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
    </div>
  );
};
