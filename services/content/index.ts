import type { Article } from '@/types';
import {
  fetchArticles as fetchGhostArticles,
  fetchArticleById as fetchGhostArticleById,
  fetchTeamMembers as fetchGhostTeamMembers,
  fetchLibraryBooks as fetchGhostLibraryBooks,
  fetchBookById as fetchGhostBookById,
} from '@/services/ghostService';
import type { ArticleKind, ContentFetchMeta, ContentProvider, PaginationInput } from './types';

type LocalArticlePayload = {
  id: string;
  internalArticleId?: string;
  source?: string;
  slug: string;
  canonicalPath?: string;
  title: string;
  excerpt?: string;
  htmlContent?: string;
  featureImage?: string;
  section: ArticleKind;
  publishedAt?: string;
  author?: {
    id: string;
    name: string;
  } | null;
  reactionCount?: number;
};

type LocalArticleListResponse = {
  items: LocalArticlePayload[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type LocalArticleSingleResponse = {
  article: LocalArticlePayload;
};

const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim();
const defaultLocalRevalidateSeconds = Number(process.env.LOCAL_CONTENT_REVALIDATE_SECONDS ?? 45);
const localRevalidateSeconds = Number.isFinite(defaultLocalRevalidateSeconds) && defaultLocalRevalidateSeconds > 0
  ? Math.floor(defaultLocalRevalidateSeconds)
  : 45;
const defaultLocalRequestTimeoutMs = Number(process.env.LOCAL_CONTENT_TIMEOUT_MS ?? 6000);
const localRequestTimeoutMs = Number.isFinite(defaultLocalRequestTimeoutMs) && defaultLocalRequestTimeoutMs >= 1000
  ? Math.floor(defaultLocalRequestTimeoutMs)
  : 6000;

const successFetchMeta: ContentFetchMeta = {
  status: 'success',
  fromFallback: false,
};

const normalizePagination = (input?: PaginationInput) => {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, input?.pageSize ?? 10));
  return { page, pageSize };
};

const normalizeDate = (value?: string) => {
  if (!value) {
    return new Date(0).toISOString();
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return new Date(0).toISOString();
  }

  return new Date(parsed).toISOString();
};

const mapLocalArticle = (article: LocalArticlePayload): Article => {
  const slug = article.slug?.trim() || article.id;
  const canonicalPath = article.canonicalPath?.trim() || `/article/${slug}`;

  return {
    id: slug,
    internalArticleId: article.internalArticleId ?? article.id,
    source: 'local',
    externalId: article.id,
    slug,
    canonicalPath,
    title: article.title,
    excerpt: article.excerpt ?? '',
    html: article.htmlContent ?? undefined,
    feature_image: article.featureImage ?? undefined,
    published_at: normalizeDate(article.publishedAt),
    authors: article.author
      ? [{
        id: article.author.id,
        name: article.author.name,
      }]
      : [],
    tags: [],
    reading_time: undefined,
    baseLikeCount: article.reactionCount ?? 0,
    type: article.section,
  };
};

const buildArticleKey = (article: Article) => {
  const key = article.canonicalPath?.trim()
    || article.slug?.trim()
    || article.externalId?.trim()
    || article.id;
  return key.toLowerCase();
};

const sortByPublishedAtDesc = (left: Article, right: Article) => {
  const leftTimestamp = Date.parse(left.published_at);
  const rightTimestamp = Date.parse(right.published_at);
  const safeLeft = Number.isFinite(leftTimestamp) ? leftTimestamp : 0;
  const safeRight = Number.isFinite(rightTimestamp) ? rightTimestamp : 0;
  return safeRight - safeLeft;
};

const emptyLocalResult = (page: number, pageSize: number) => ({
  items: [] as Article[],
  total: 0,
  page,
  pageSize,
  totalPages: 1,
  fetchMeta: successFetchMeta,
});

const fetchLocalArticleList = async (
  type: ArticleKind | undefined,
  pagination?: PaginationInput,
) => {
  const { page, pageSize } = normalizePagination(pagination);
  if (!backendBaseUrl) {
    return emptyLocalResult(page, pageSize);
  }

  const search = new URLSearchParams();
  search.set('page', `${page}`);
  search.set('pageSize', `${pageSize}`);
  if (type) {
    search.set('section', type);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, localRequestTimeoutMs);

  try {
    const response = await fetch(`${backendBaseUrl}/api/content/articles?${search.toString()}`, {
      signal: controller.signal,
      next: {
        revalidate: localRevalidateSeconds,
        tags: ['local:articles', type ? `local:articles:${type}` : 'local:articles:all'],
      },
    });

    if (!response.ok) {
      return {
        ...emptyLocalResult(page, pageSize),
        fetchMeta: {
          status: 'error',
          fromFallback: false,
          reason: `local content response ${response.status}`,
        } satisfies ContentFetchMeta,
      };
    }

    const payload = (await response.json()) as LocalArticleListResponse;
    return {
      items: payload.items.map((item) => mapLocalArticle(item)),
      total: payload.total,
      page: payload.page,
      pageSize: payload.pageSize,
      totalPages: payload.totalPages,
      fetchMeta: successFetchMeta,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'local content request failed';
    return {
      ...emptyLocalResult(page, pageSize),
      fetchMeta: {
        status: 'error',
        fromFallback: false,
        reason,
      } satisfies ContentFetchMeta,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchLocalArticleById = async (id: string): Promise<Article | undefined> => {
  if (!backendBaseUrl) {
    return undefined;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, localRequestTimeoutMs);

  try {
    const response = await fetch(`${backendBaseUrl}/api/content/articles/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      next: {
        revalidate: localRevalidateSeconds,
        tags: [`local:article:${id}`],
      },
    });

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as LocalArticleSingleResponse;
    if (!payload.article) {
      return undefined;
    }

    return mapLocalArticle(payload.article);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchArticles: ContentProvider['fetchArticles'] = async (type, pagination) => {
  const { page, pageSize } = normalizePagination(pagination);
  const [ghostResult, localOverlay] = await Promise.all([
    fetchGhostArticles(type, { page, pageSize }),
    page === 1 ? fetchLocalArticleList(type, { page: 1, pageSize: 25 }) : Promise.resolve(emptyLocalResult(1, 25)),
  ]);

  if (localOverlay.items.length === 0) {
    return ghostResult;
  }

  const deduped = new Map<string, Article>();
  for (const item of [...localOverlay.items, ...ghostResult.items]) {
    const key = buildArticleKey(item);
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  const mergedItems = [...deduped.values()]
    .sort(sortByPublishedAtDesc)
    .slice(0, pageSize);

  const ghostKeys = new Set(ghostResult.items.map((item) => buildArticleKey(item)));
  const uniqueLocalCount = localOverlay.items.reduce((count, item) => {
    return count + (ghostKeys.has(buildArticleKey(item)) ? 0 : 1);
  }, 0);
  const total = ghostResult.total + uniqueLocalCount;

  const mergedFetchMeta: ContentFetchMeta = ghostResult.fetchMeta.status === 'success'
    ? ghostResult.fetchMeta
    : {
      status: 'stale',
      fromFallback: true,
      reason: ghostResult.fetchMeta.reason ?? 'ghost is unavailable, showing local published overlay',
    };

  return {
    ...ghostResult,
    items: mergedItems,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    fetchMeta: mergedFetchMeta,
  };
};

export const fetchArticleById: ContentProvider['fetchArticleById'] = async (id) => {
  const localArticle = await fetchLocalArticleById(id);
  if (localArticle) {
    return localArticle;
  }

  return fetchGhostArticleById(id);
};

export const fetchTeamMembers: ContentProvider['fetchTeamMembers'] = (...args) => fetchGhostTeamMembers(...args);
export const fetchLibraryBooks: ContentProvider['fetchLibraryBooks'] = (...args) => fetchGhostLibraryBooks(...args);
export const fetchBookById: ContentProvider['fetchBookById'] = (...args) => fetchGhostBookById(...args);

export type { ContentProvider } from './types';
export type { ArticleKind, PaginatedResult, PaginationInput } from './types';
