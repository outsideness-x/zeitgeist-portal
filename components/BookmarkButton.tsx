"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { backendRequest } from '@/services/backend/client';

type BookmarkButtonProps = {
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
  variant?: 'default' | 'card';
  deferInitialStatus?: boolean;
};

type EnsureArticleResponse = {
  articleId: string;
};

type BookmarkStatusResponse = {
  articleId: string;
  bookmarked: boolean;
};

type BookmarkMutationResponse = {
  articleId: string;
  bookmarked: boolean;
  bookmarkCount: number;
};

const normalizeFeatureImageForEnsure = (rawValue?: string): string | undefined => {
  const value = rawValue?.trim();
  if (!value) {
    return undefined;
  }

  const candidate = value.startsWith('//') ? `https:${value}` : value;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const BookmarkButton = ({
  article,
  variant = 'default',
  deferInitialStatus = variant === 'card',
}: BookmarkButtonProps): JSX.Element => {
  const { user, csrfToken, loading: authLoading } = useAuth();
  const [internalArticleId, setInternalArticleId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const articleSource = article.source === 'local' ? 'local' : 'ghost';
  const normalizedExternalId = article.externalId?.trim() ? article.externalId : undefined;
  const normalizedSlug = article.slug?.trim() || article.id;
  const normalizedCanonicalPath = article.canonicalPath?.trim() || `/article/${normalizedSlug}`;
  const normalizedFeatureImage = normalizeFeatureImageForEnsure(article.feature_image);

  const ensurePayload = useMemo(() => ({
    source: articleSource,
    externalId: normalizedExternalId,
    slug: normalizedSlug,
    title: article.title,
    excerpt: article.excerpt,
    section: article.type,
    canonicalPath: normalizedCanonicalPath,
    featureImage: normalizedFeatureImage,
  }), [article.excerpt, article.title, article.type, articleSource, normalizedCanonicalPath, normalizedExternalId, normalizedFeatureImage, normalizedSlug]);

  const openAuthPrompt = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('zg:open-auth-modal'));
  };

  const ensureArticleExists = useCallback(async (): Promise<string> => {
    const ensured = await backendRequest<EnsureArticleResponse>({
      path: '/api/articles/ensure',
      method: 'POST',
      body: ensurePayload,
    });

    return ensured.articleId;
  }, [ensurePayload]);

  const fetchBookmarkStatus = useCallback(async (articleId: string): Promise<boolean> => {
    const status = await backendRequest<BookmarkStatusResponse>({
      path: `/api/me/bookmarks/status?articleId=${encodeURIComponent(articleId)}`,
    });

    return Boolean(status.bookmarked);
  }, []);

  useEffect(() => {
    let active = true;

    const syncBookmarkState = async () => {
      if (authLoading) {
        setIsLoading(true);
        return;
      }

      if (!user) {
        setInternalArticleId(null);
        setBookmarked(false);
        setStatusLoaded(false);
        setErrorMessage('');
        setIsLoading(false);
        return;
      }

      if (deferInitialStatus) {
        setInternalArticleId(null);
        setBookmarked(false);
        setErrorMessage('');
        setIsLoading(false);
        setStatusLoaded(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const articleId = await ensureArticleExists();

        if (!active) {
          return;
        }

        const nextBookmarked = await fetchBookmarkStatus(articleId);

        if (!active) {
          return;
        }

        setInternalArticleId(articleId);
        setBookmarked(nextBookmarked);
        setStatusLoaded(true);
      } catch (error) {
        if (!active) {
          return;
        }

        setInternalArticleId(null);
        setBookmarked(false);
        setStatusLoaded(false);
        setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить закладки');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void syncBookmarkState();

    return () => {
      active = false;
    };
  }, [authLoading, deferInitialStatus, ensureArticleExists, fetchBookmarkStatus, user]);

  const primeStatus = async (): Promise<void> => {
    if (authLoading || !user || isLoading || isSubmitting || statusLoaded) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const articleId = internalArticleId ?? await ensureArticleExists();
      const nextBookmarked = await fetchBookmarkStatus(articleId);

      setInternalArticleId(articleId);
      setBookmarked(nextBookmarked);
      setStatusLoaded(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'не удалось загрузить закладки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (): Promise<void> => {
    if (authLoading || isLoading || isSubmitting) {
      return;
    }

    if (!user || !csrfToken) {
      setErrorMessage('войдите, чтобы добавлять в закладки');
      openAuthPrompt();
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    let resolvedArticleId = internalArticleId;
    let previousValue = bookmarked;

    try {
      if (!resolvedArticleId) {
        resolvedArticleId = await ensureArticleExists();
        setInternalArticleId(resolvedArticleId);
      }

      if (!statusLoaded) {
        previousValue = await fetchBookmarkStatus(resolvedArticleId);
        setBookmarked(previousValue);
        setStatusLoaded(true);
      }

      const nextValue = !previousValue;
      setBookmarked(nextValue);

      const response = nextValue
        ? await backendRequest<BookmarkMutationResponse>({
          path: '/api/me/bookmarks',
          method: 'POST',
          csrfToken,
          body: {
            articleId: resolvedArticleId,
          },
        })
        : await backendRequest<BookmarkMutationResponse>({
          path: `/api/me/bookmarks/${encodeURIComponent(resolvedArticleId)}`,
          method: 'DELETE',
          csrfToken,
        });

      setBookmarked(Boolean(response.bookmarked));
      setStatusLoaded(true);
    } catch (error) {
      setBookmarked(previousValue);
      setErrorMessage(error instanceof Error ? error.message : 'не удалось обновить закладку');
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = authLoading || isLoading || isSubmitting;
  const label = bookmarked ? 'в закладках' : 'в закладки';
  const isCardVariant = variant === 'card';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleToggle()}
        onMouseEnter={deferInitialStatus ? () => void primeStatus() : undefined}
        onFocus={deferInitialStatus ? () => void primeStatus() : undefined}
        disabled={busy}
        aria-label={bookmarked ? 'убрать из закладок' : 'добавить в закладки'}
        aria-pressed={bookmarked}
        data-active={bookmarked ? 'true' : 'false'}
        data-busy={busy ? 'true' : 'false'}
        className={isCardVariant
          ? 'article-card-bookmark h-12 w-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60'
          : `inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md p-2 text-sm transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
            bookmarked
              ? 'text-accent dark:text-accent'
              : 'text-ink dark:text-gray-300'
          }`}
      >
        <span className={`${isCardVariant ? 'inline-flex h-12 w-12 items-center justify-center' : 'inline-flex h-11 w-11 items-center justify-center'}`} aria-hidden="true">
          {busy ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill={bookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"
              />
            </svg>
          )}
        </span>
        {!isCardVariant ? (
          <span className="hidden font-sans text-xs uppercase tracking-wider sm:inline">{label}</span>
        ) : null}
      </button>
      {errorMessage && (
        <p className={isCardVariant
          ? 'max-w-40 text-right font-sans text-[9px] uppercase tracking-[0.16em] text-red-200/90'
          : 'max-w-56 text-right font-sans text-[10px] uppercase tracking-wider text-red-600'}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};
