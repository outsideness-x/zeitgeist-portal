"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { backendRequest } from '@/services/backend/client';

type EnsureResponse = {
  articleId: string;
};

type EngagementResponse = {
  bookmarkCount: number;
  reactionCounts: Record<string, number>;
  totalViews: number;
  totalUniqueVisitors: number;
};

type ReactionsResponse = {
  likeCount: number;
  applauseCount: number;
  cap: number;
  viewer: {
    liked: boolean;
    applauseCountByMe: number;
  };
};

type ApplauseResponse = ReactionsResponse & {
  requestedDelta: number;
  appliedDelta: number;
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

export const ArticleEngagement = (props: Props) => {
  const { user, csrfToken } = useAuth();
  const [internalArticleId, setInternalArticleId] = useState<string | null>(props.initialInternalArticleId ?? null);
  const [engagement, setEngagement] = useState<EngagementResponse | null>(null);
  const [reactions, setReactions] = useState<ReactionsResponse | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const viewSentRef = useRef<string | null>(null);
  const applauseQueueRef = useRef(0);
  const applauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applauseRequestInFlightRef = useRef(false);

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

  const loadReactions = async (articleId: string) => {
    const summary = await backendRequest<ReactionsResponse>({
      path: `/api/articles/${articleId}/reactions`,
    });
    setReactions(summary);
  };

  const loadBookmarkState = async (articleId: string) => {
    if (!user) {
      setBookmarked(false);
      return;
    }

    const bookmarkResponse = await backendRequest<{ bookmarked: boolean }>({
      path: `/api/articles/${articleId}/bookmark/me`,
    });

    setBookmarked(bookmarkResponse.bookmarked);
  };

  const flushApplauseQueue = async () => {
    if (!internalArticleId || !user || !csrfToken) {
      applauseQueueRef.current = 0;
      return;
    }

    if (applauseRequestInFlightRef.current || applauseQueueRef.current <= 0) {
      return;
    }

    const queuedDelta = applauseQueueRef.current;
    applauseQueueRef.current = 0;
    applauseRequestInFlightRef.current = true;

    try {
      const response = await backendRequest<ApplauseResponse>({
        path: `/api/articles/${internalArticleId}/applause`,
        method: 'POST',
        csrfToken,
        body: {
          delta: queuedDelta,
        },
      });

      setReactions({
        likeCount: response.likeCount,
        applauseCount: response.applauseCount,
        cap: response.cap,
        viewer: response.viewer,
      });
    } catch (error) {
      try {
        await loadReactions(internalArticleId);
      } catch {
        // this keeps existing optimistic state until the next successful sync
      }
      setErrorMessage(error instanceof Error ? error.message : 'не удалось сохранить аплодисменты');
    } finally {
      applauseRequestInFlightRef.current = false;
      if (applauseQueueRef.current > 0) {
        applauseTimerRef.current = setTimeout(() => {
          void flushApplauseQueue();
        }, 100);
      }
    }
  };

  const scheduleApplauseFlush = () => {
    if (applauseTimerRef.current) {
      clearTimeout(applauseTimerRef.current);
    }

    applauseTimerRef.current = setTimeout(() => {
      void flushApplauseQueue();
    }, 400);
  };

  useEffect(() => {
    // this lazy ensure call binds page-level content to the internal article registry before tracking events
    const run = async () => {
      try {
        const articleId = await ensureArticle();
        await Promise.all([
          loadEngagement(articleId),
          loadReactions(articleId),
          loadBookmarkState(articleId),
        ]);

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
    void Promise.all([
      loadBookmarkState(internalArticleId),
      loadReactions(internalArticleId),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, internalArticleId]);

  useEffect(() => {
    return () => {
      if (applauseTimerRef.current) {
        clearTimeout(applauseTimerRef.current);
      }
    };
  }, []);

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

  const handleLikeToggle = async () => {
    if (!user || !csrfToken) {
      setErrorMessage('войдите, чтобы оставить реакцию');
      return;
    }
    if (!internalArticleId || !reactions) {
      return;
    }

    const previousState = reactions;
    const willLike = !previousState.viewer.liked;

    setReactions({
      ...previousState,
      likeCount: Math.max(0, previousState.likeCount + (willLike ? 1 : -1)),
      viewer: {
        ...previousState.viewer,
        liked: willLike,
      },
    });

    setBusy(true);
    setErrorMessage('');
    try {
      const response = await backendRequest<ReactionsResponse>({
        path: `/api/articles/${internalArticleId}/like`,
        method: willLike ? 'POST' : 'DELETE',
        csrfToken,
      });
      setReactions(response);
    } catch (error) {
      setReactions(previousState);
      setErrorMessage(error instanceof Error ? error.message : 'не удалось сохранить реакцию');
    } finally {
      setBusy(false);
    }
  };

  const handleApplause = () => {
    if (!user || !csrfToken) {
      setErrorMessage('войдите, чтобы оставить реакцию');
      return;
    }
    if (!internalArticleId || !reactions) {
      return;
    }

    const remaining = Math.max(0, reactions.cap - reactions.viewer.applauseCountByMe);
    if (remaining <= 0) {
      return;
    }

    applauseQueueRef.current += 1;
    setErrorMessage('');
    setReactions({
      ...reactions,
      applauseCount: reactions.applauseCount + 1,
      viewer: {
        ...reactions.viewer,
        applauseCountByMe: reactions.viewer.applauseCountByMe + 1,
      },
    });

    scheduleApplauseFlush();
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

  const applauseAtCap = useMemo(() => {
    if (!reactions) {
      return false;
    }
    return reactions.viewer.applauseCountByMe >= reactions.cap;
  }, [reactions]);

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

        <button
          type="button"
          onClick={() => void handleLikeToggle()}
          disabled={busy || !internalArticleId || !reactions}
          className={`border px-3 py-2 text-xs uppercase tracking-wider ${reactions?.viewer.liked ? 'border-accent bg-accent text-white' : 'border-sepia hover:border-accent'} disabled:opacity-50`}
        >
          нравится ({reactions?.likeCount ?? 0})
        </button>

        <button
          type="button"
          onClick={() => handleApplause()}
          disabled={busy || !internalArticleId || !reactions || applauseAtCap}
          className="border border-sepia px-3 py-2 text-xs uppercase tracking-wider hover:border-accent disabled:opacity-50"
        >
          аплодисменты ({reactions?.applauseCount ?? 0}) · мои {reactions?.viewer.applauseCountByMe ?? 0}
        </button>

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
