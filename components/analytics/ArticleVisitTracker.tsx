"use client";

import { useEffect, useMemo } from 'react';
import { backendRequest } from '@/services/backend/client';
import { postAnalyticsActivity } from '@/services/backend/analytics';

type ArticleVisitTrackerProps = {
  article: {
    internalArticleId?: string;
    source?: 'local' | 'ghost';
    externalId?: string;
    slug?: string;
    canonicalPath?: string;
    title: string;
    excerpt: string;
    feature_image?: string;
    type: 'journal' | 'research' | 'nova';
  };
};

type EnsureArticleResponse = {
  articleId: string;
};

const visitDedupWindowMs = 4_000;

const normalizeFeatureImageForEnsure = (rawValue?: string) => {
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

const markVisitAttempt = (key: string) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const now = Date.now();
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    const parsed = Number.parseInt(existing, 10);
    if (Number.isFinite(parsed) && (now - parsed) < visitDedupWindowMs) {
      return false;
    }
  }

  window.sessionStorage.setItem(key, `${now}`);
  return true;
};

export const ArticleVisitTracker = ({ article }: ArticleVisitTrackerProps) => {
  const normalizedSlug = article.slug?.trim() || article.externalId?.trim() || article.title;
  const normalizedCanonicalPath = article.canonicalPath?.trim() || `/article/${normalizedSlug}`;
  const normalizedFeatureImage = normalizeFeatureImageForEnsure(article.feature_image);

  const ensurePayload = useMemo(() => ({
    source: article.source === 'local' ? 'local' : 'ghost',
    externalId: article.externalId?.trim() ? article.externalId : undefined,
    slug: normalizedSlug,
    title: article.title,
    excerpt: article.excerpt,
    section: article.type,
    canonicalPath: normalizedCanonicalPath,
    featureImage: normalizedFeatureImage,
  }), [
    article.excerpt,
    article.externalId,
    article.source,
    article.title,
    article.type,
    normalizedCanonicalPath,
    normalizedFeatureImage,
    normalizedSlug,
  ]);

  useEffect(() => {
    const visitKey = `zg:article-visit:${normalizedCanonicalPath}`;
    if (!markVisitAttempt(visitKey)) {
      return;
    }

    let cancelled = false;

    const trackArticleVisit = async () => {
      try {
        const articleId = article.internalArticleId?.trim()
          ? article.internalArticleId
          : (await backendRequest<EnsureArticleResponse>({
            path: '/api/articles/ensure',
            method: 'POST',
            body: ensurePayload,
          })).articleId;

        if (cancelled) {
          return;
        }

        await postAnalyticsActivity({
          kind: 'pageview',
          path: normalizedCanonicalPath,
          articleId,
        });
      } catch {
        // analytics failures should not affect article rendering
      }
    };

    void trackArticleVisit();

    return () => {
      cancelled = true;
    };
  }, [article.internalArticleId, ensurePayload, normalizedCanonicalPath]);

  return null;
};
