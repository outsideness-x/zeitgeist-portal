import type { Article, LibraryBook, TeamMember } from '@/types';
import type { ArticleKind, ContentFetchMeta, PaginatedResult, PaginationInput } from '@/services/content/types';
import { normalizeGhostAssetUrl } from '@/services/content/imageUrl';
import { trackQueryState, trackUnexpectedEmptyData } from '@/services/content/observability';

type GhostTag = {
  id: string;
  name: string;
  slug: string;
};

type GhostAuthor = {
  id: string;
  name: string;
  slug: string;
  profile_image?: string | null;
};

type GhostPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  custom_excerpt?: string | null;
  html?: string | null;
  feature_image?: string | null;
  published_at?: string | null;
  reading_time?: number | null;
  canonical_url?: string | null;
  authors?: GhostAuthor[];
  tags?: GhostTag[];
};

type GhostMetaPagination = {
  page: number;
  pages: number;
  limit: number;
  total: number;
};

type GhostPostListResponse = {
  posts: GhostPost[];
  meta?: { pagination?: GhostMetaPagination };
};

type GhostPostSingleResponse = {
  posts: GhostPost[];
};

type GhostRequestResult<T> = {
  data?: T;
  fetchMeta: ContentFetchMeta;
};

const ghostApiUrl = (process.env.GHOST_CONTENT_API_URL ?? '').trim();
const ghostApiKey = (process.env.GHOST_CONTENT_API_KEY ?? '').trim();
const defaultRevalidate = Number(process.env.GHOST_REVALIDATE_SECONDS ?? 120);
const revalidateSeconds = Number.isFinite(defaultRevalidate) && defaultRevalidate > 0 ? Math.floor(defaultRevalidate) : 120;
const defaultGhostTimeout = Number(process.env.GHOST_REQUEST_TIMEOUT_MS ?? 8000);
const ghostRequestTimeoutMs = Number.isFinite(defaultGhostTimeout) && defaultGhostTimeout >= 2000
  ? Math.floor(defaultGhostTimeout)
  : 8000;
const ghostContentOrigin = (() => {
  if (!ghostApiUrl) {
    return 'https://api.zeitgeist.host';
  }

  try {
    return new URL(ghostApiUrl).origin;
  } catch {
    return 'https://api.zeitgeist.host';
  }
})();
const SECTION_TAG_SLUGS = new Set(['journal', 'research', 'nova', 'nova-express']);
const RESERVED_NON_AUTHOR_TAG_SLUGS = new Set(['team', 'library']);
const AUTHOR_TAG_SLUG_PREFIXES = ['author-', 'author_'] as const;
const AUTHOR_TAG_NAME_PREFIX = /^(author|автор)\b[\s:_-]*/iu;
const LAST_GOOD_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_LAST_GOOD_ENTRIES = 200;
const MAX_LAST_KNOWN_ARTICLES = 500;
const lastGoodGhostResponse = new Map<string, { cachedAt: number; payload: unknown }>();
const lastKnownArticles = new Map<string, { cachedAt: number; article: Article }>();

const isGhostEnabled = () => {
  return ghostApiUrl.length > 0 && ghostApiKey.length > 0;
};

const isDebugEnabled = () => {
  return process.env.CONTENT_DEBUG_LOGS === '1' || process.env.NEXT_PUBLIC_CONTENT_DEBUG_LOGS === '1';
};

const debugLog = (event: string, payload: Record<string, unknown>) => {
  if (!isDebugEnabled()) {
    return;
  }

  console.info('[content-debug]', event, payload);
};

const buildRequestKey = (path: string, query: URLSearchParams) => {
  const sorted = new URLSearchParams(query.toString());
  sorted.sort();
  return `${path}?${sorted.toString()}`;
};

const putLastGoodResponse = (requestKey: string, payload: unknown) => {
  lastGoodGhostResponse.set(requestKey, {
    cachedAt: Date.now(),
    payload,
  });

  if (lastGoodGhostResponse.size <= MAX_LAST_GOOD_ENTRIES) {
    return;
  }

  const oldestEntry = [...lastGoodGhostResponse.entries()]
    .sort((left, right) => left[1].cachedAt - right[1].cachedAt)
    .at(0);

  if (oldestEntry) {
    lastGoodGhostResponse.delete(oldestEntry[0]);
  }
};

const rememberArticle = (article: Article) => {
  const cacheEntry = {
    cachedAt: Date.now(),
    article,
  };

  lastKnownArticles.set(article.id, cacheEntry);
  if (article.slug) {
    lastKnownArticles.set(article.slug, cacheEntry);
  }
  if (article.externalId) {
    lastKnownArticles.set(article.externalId, cacheEntry);
  }

  if (lastKnownArticles.size <= MAX_LAST_KNOWN_ARTICLES) {
    return;
  }

  const oldestEntry = [...lastKnownArticles.entries()]
    .sort((left, right) => left[1].cachedAt - right[1].cachedAt)
    .at(0);

  if (oldestEntry) {
    lastKnownArticles.delete(oldestEntry[0]);
  }
};

const getLastKnownArticle = (id: string): Article | undefined => {
  return lastKnownArticles.get(id)?.article;
};

const getLastGoodResponse = <T,>(requestKey: string): T | undefined => {
  const cached = lastGoodGhostResponse.get(requestKey);
  if (!cached) {
    return undefined;
  }

  if (Date.now() - cached.cachedAt > LAST_GOOD_TTL_MS) {
    lastGoodGhostResponse.delete(requestKey);
    return undefined;
  }

  return cached.payload as T;
};

const successFetchMeta: ContentFetchMeta = {
  status: 'success',
  fromFallback: false,
};

const normalizePagination = (input?: PaginationInput) => {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, input?.pageSize ?? 10));
  return { page, pageSize };
};

const routeByArticleKind = (type?: ArticleKind) => {
  if (!type) {
    return '/';
  }

  if (type === 'nova') {
    return '/nova-express';
  }

  return `/${type}`;
};

const summarizeGhostPath = (path: string) => {
  if (path.includes('/ghost/api/content/posts/slug/')) {
    return '/ghost/api/content/posts/slug/:slug/';
  }

  if (/\/ghost\/api\/content\/posts\/[^/]+\/$/.test(path)) {
    return '/ghost/api/content/posts/:id/';
  }

  return path;
};

const normalizeTagSlug = (tag: GhostTag) => tag.slug.trim().toLowerCase();

const compact = <T,>(items: Array<T | undefined>) => {
  return items.filter((item): item is T => item !== undefined);
};

const uniqueAuthorsByName = (authors: Article['authors']): Article['authors'] => {
  const seen = new Set<string>();
  const result: Article['authors'] = [];

  for (const author of authors) {
    const key = author.name.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(author);
  }

  return result;
};

const toTitleCase = (value: string) => {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const normalizeAuthorName = (value: string) => {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const stripAuthorPrefix = (value: string) => {
  return value.replace(AUTHOR_TAG_NAME_PREFIX, '').trim();
};

const isSectionTag = (tag: GhostTag) => SECTION_TAG_SLUGS.has(normalizeTagSlug(tag));

const isAuthorTag = (tag: GhostTag) => {
  const slug = normalizeTagSlug(tag);
  const name = tag.name.trim();

  return AUTHOR_TAG_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix)) || AUTHOR_TAG_NAME_PREFIX.test(name);
};

const looksLikePersonName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return false;
  }

  return parts.every((part) => part.length >= 2);
};

const mapAuthorFromTag = (tag: GhostTag): Article['authors'][number] | undefined => {
  const rawName = tag.name.trim();
  const normalizedRawName = normalizeAuthorName(stripAuthorPrefix(rawName));

  if (normalizedRawName) {
    return {
      id: `tag:${tag.id}`,
      name: normalizedRawName,
    };
  }

  const slug = normalizeTagSlug(tag);
  const slugWithoutPrefix = AUTHOR_TAG_SLUG_PREFIXES.reduce((value, prefix) => {
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }, slug);
  const normalizedFromSlug = normalizeAuthorName(slugWithoutPrefix);
  if (!normalizedFromSlug) {
    return undefined;
  }

  return {
    id: `tag:${tag.id}`,
    name: toTitleCase(normalizedFromSlug),
  };
};

const mapGhostStaffAuthors = (post: GhostPost): Article['authors'] => {
  return post.authors?.map((author) => ({
    id: author.id,
    name: author.name,
    avatar: author.profile_image ?? undefined,
  })) ?? [];
};

const resolveAuthorTags = (tags: GhostTag[]) => {
  const explicitAuthorTags = tags.filter((tag) => isAuthorTag(tag));
  if (explicitAuthorTags.length > 0) {
    return explicitAuthorTags;
  }

  return tags.filter((tag) => {
    const slug = normalizeTagSlug(tag);
    return (
      !isSectionTag(tag) &&
      !RESERVED_NON_AUTHOR_TAG_SLUGS.has(slug) &&
      looksLikePersonName(tag.name)
    );
  });
};

const resolvePostAuthors = (post: GhostPost): Article['authors'] => {
  const tags = post.tags ?? [];
  const authorTags = resolveAuthorTags(tags);
  const tagAuthors = uniqueAuthorsByName(compact(authorTags.map((tag) => mapAuthorFromTag(tag))));
  if (tagAuthors.length > 0) {
    return tagAuthors;
  }

  return uniqueAuthorsByName(mapGhostStaffAuthors(post));
};

const resolveArticleType = (tags?: GhostTag[]): ArticleKind => {
  const slugs = tags?.map((tag) => normalizeTagSlug(tag)) ?? [];

  if (slugs.includes('research')) {
    return 'research';
  }

  if (slugs.includes('nova') || slugs.includes('nova-express')) {
    return 'nova';
  }

  return 'journal';
};

const mapDisplayTags = (tags?: GhostTag[]) => {
  if (!tags) {
    return [];
  }

  const hiddenTagIds = new Set(resolveAuthorTags(tags).map((tag) => tag.id));
  return tags.filter((tag) => !hiddenTagIds.has(tag.id)).map((tag) => tag.name);
};

const normalizeGhostHtmlAssets = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  const withSrc = value.replace(/\bsrc=(["'])([^"']+)\1/gi, (_match: string, quote: string, src: string) => {
    const normalized = normalizeGhostAssetUrl(src, { ghostContentOrigin }) ?? src;
    return `src=${quote}${normalized}${quote}`;
  });

  return withSrc.replace(/\bsrcset=(["'])([^"']+)\1/gi, (_match: string, quote: string, srcset: string) => {
    const normalizedSrcset = srcset
      .split(',')
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed) {
          return trimmed;
        }

        const [urlCandidate, ...descriptor] = trimmed.split(/\s+/);
        const normalizedUrl = normalizeGhostAssetUrl(urlCandidate, { ghostContentOrigin }) ?? urlCandidate;
        return descriptor.length > 0 ? `${normalizedUrl} ${descriptor.join(' ')}` : normalizedUrl;
      })
      .join(', ');

    return `srcset=${quote}${normalizedSrcset}${quote}`;
  });
};

const emptyPaginatedResult = <T,>(pagination: PaginationInput | undefined, fetchMeta: ContentFetchMeta): PaginatedResult<T> => {
  const { page, pageSize } = normalizePagination(pagination);
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
    fetchMeta,
  };
};

const mapPostToArticle = (post: GhostPost): Article => {
  const type = resolveArticleType(post.tags);
  const normalizedFeatureImage = normalizeGhostAssetUrl(post.feature_image, { ghostContentOrigin });

  const article: Article = {
    id: post.slug || post.id,
    source: 'ghost',
    externalId: post.id,
    slug: post.slug || post.id,
    canonicalPath: `/article/${post.slug || post.id}`,
    title: post.title,
    excerpt: post.custom_excerpt || post.excerpt || '',
    html: normalizeGhostHtmlAssets(post.html),
    feature_image: normalizedFeatureImage,
    published_at: post.published_at || new Date(0).toISOString(),
    authors: resolvePostAuthors(post),
    tags: mapDisplayTags(post.tags),
    reading_time: post.reading_time ?? undefined,
    baseLikeCount: 0,
    type,
  };

  if (isDebugEnabled()) {
    debugLog('ghost-post-normalized', {
      externalId: post.id,
      slug: post.slug,
      type,
      rawFeatureImage: post.feature_image ?? null,
      normalizedFeatureImage: article.feature_image ?? null,
      hasHtml: Boolean(post.html),
    });
  }

  rememberArticle(article);

  return article;
};

const requestGhost = async <T>(path: string, query: URLSearchParams): Promise<GhostRequestResult<T>> => {
  const requestKey = buildRequestKey(path, query);
  const pathForTelemetry = summarizeGhostPath(path);
  const fallbackPayload = getLastGoodResponse<T>(requestKey);

  if (!isGhostEnabled()) {
    const fetchMeta: ContentFetchMeta = {
      status: 'error',
      fromFallback: false,
      reason: 'ghost content api is not configured',
    };

    trackQueryState({
      route: pathForTelemetry,
      component: 'ghostService.requestGhost',
      reason: fetchMeta.reason,
    });

    return {
      data: fallbackPayload,
      fetchMeta: fallbackPayload
        ? {
          status: 'stale',
          fromFallback: true,
          reason: fetchMeta.reason,
        }
        : fetchMeta,
    };
  }

  const url = new URL(path, ghostApiUrl);
  url.searchParams.set('key', ghostApiKey);
  query.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ghostRequestTimeoutMs);

  try {
    const response = await fetch(url.toString(), {
      next: {
        revalidate: revalidateSeconds,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const reason = `ghost response ${response.status}`;
      if (fallbackPayload) {
        trackQueryState({
          route: pathForTelemetry,
          component: 'ghostService.requestGhost',
          reason: `stale:${reason}`,
        });

        debugLog('ghost-request-fallback', {
          path,
          reason,
          source: 'last-known-good',
        });

        return {
          data: fallbackPayload,
          fetchMeta: {
            status: 'stale',
            fromFallback: true,
            reason,
          },
        };
      }

      trackQueryState({
        route: pathForTelemetry,
        component: 'ghostService.requestGhost',
        reason: `error:${reason}`,
      });

      return {
        fetchMeta: {
          status: 'error',
          fromFallback: false,
          reason,
        },
      };
    }

    const data = (await response.json()) as T;
    putLastGoodResponse(requestKey, data);

    trackQueryState({
      route: pathForTelemetry,
      component: 'ghostService.requestGhost',
      reason: 'success',
    });

    return {
      data,
      fetchMeta: successFetchMeta,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown request error';
    if (fallbackPayload) {
      trackQueryState({
        route: pathForTelemetry,
        component: 'ghostService.requestGhost',
        reason: `stale:${reason}`,
      });

      debugLog('ghost-request-fallback', {
        path,
        reason,
        source: 'last-known-good',
      });

      return {
        data: fallbackPayload,
        fetchMeta: {
          status: 'stale',
          fromFallback: true,
          reason,
        },
      };
    }

    trackQueryState({
      route: pathForTelemetry,
      component: 'ghostService.requestGhost',
      reason: `error:${reason}`,
    });

    return {
      fetchMeta: {
        status: 'error',
        fromFallback: false,
        reason,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchPostBySlug = async (slug: string): Promise<GhostPost | undefined> => {
  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '1');

  const response = await requestGhost<GhostPostSingleResponse>(
    `/ghost/api/content/posts/slug/${encodeURIComponent(slug)}/`,
    query,
  );

  return response.data?.posts?.[0];
};

const fetchPostById = async (id: string): Promise<GhostPost | undefined> => {
  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '1');

  const response = await requestGhost<GhostPostSingleResponse>(
    `/ghost/api/content/posts/${encodeURIComponent(id)}/`,
    query,
  );

  return response.data?.posts?.[0];
};

const fetchArticlesByQuery = async (
  type: ArticleKind | undefined,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Article>> => {
  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('page', `${page}`);
  query.set('limit', `${pageSize}`);

  if (type) {
    query.set('filter', `tag:${type}`);
  }

  const response = await requestGhost<GhostPostListResponse>(
    '/ghost/api/content/posts/',
    query,
  );

  if (!response.data) {
    trackUnexpectedEmptyData({
      route: routeByArticleKind(type),
      component: 'ghostService.fetchArticles',
      reason: response.fetchMeta.reason ?? 'missing response payload',
    });
    return emptyPaginatedResult<Article>({ page, pageSize }, response.fetchMeta);
  }

  const items = response.data.posts.map((post) => mapPostToArticle(post));
  const meta = response.data.meta?.pagination;

  if (items.length === 0 && page === 1) {
    trackUnexpectedEmptyData({
      route: routeByArticleKind(type),
      component: 'ghostService.fetchArticles',
      reason: response.fetchMeta.reason ?? 'ghost returned empty first page',
    });
  }

  return {
    items,
    total: meta?.total ?? items.length,
    page: meta?.page ?? page,
    pageSize: meta?.limit ?? pageSize,
    totalPages: Math.max(1, meta?.pages ?? 1),
    fetchMeta: response.fetchMeta,
  };
};

export const fetchArticles = async (
  type?: ArticleKind,
  pagination?: PaginationInput,
): Promise<PaginatedResult<Article>> => {
  const { page, pageSize } = normalizePagination(pagination);
  return fetchArticlesByQuery(type, page, pageSize);
};

export const fetchArticleById = async (id: string): Promise<Article | undefined> => {
  const bySlug = await fetchPostBySlug(id);
  if (bySlug) {
    return mapPostToArticle(bySlug);
  }

  const byId = await fetchPostById(id);
  if (byId) {
    return mapPostToArticle(byId);
  }

  const fallbackArticle = getLastKnownArticle(id);
  if (fallbackArticle) {
    trackQueryState({
      route: '/ghost/api/content/posts/:id',
      component: 'ghostService.fetchArticleById',
      reason: 'stale:article-memory-fallback',
    });
    return fallbackArticle;
  }

  return undefined;
};

export const fetchTeamMembers = async (): Promise<TeamMember[]> => {
  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '100');
  query.set('filter', 'tag:team');

  const response = await requestGhost<GhostPostListResponse>(
    '/ghost/api/content/posts/',
    query,
  );

  if (!response.data) {
    return [];
  }

  return response.data.posts.map((post) => ({
    id: post.slug || post.id,
    name: post.title,
    role: post.tags?.find((tag) => tag.slug !== 'team')?.name ?? 'researcher',
    photoUrl: normalizeGhostAssetUrl(post.feature_image, { ghostContentOrigin }),
    bio: post.custom_excerpt || post.excerpt || '',
  }));
};

export const fetchLibraryBooks = async (): Promise<LibraryBook[]> => {
  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '100');
  query.set('filter', 'tag:library');

  const response = await requestGhost<GhostPostListResponse>(
    '/ghost/api/content/posts/',
    query,
  );

  if (!response.data) {
    return [];
  }

  return response.data.posts.map((post) => {
    const publishedYear = post.published_at ? new Date(post.published_at).getUTCFullYear().toString() : '';
    const pdfUrl = post.canonical_url?.toLowerCase().endsWith('.pdf') ? post.canonical_url : '';
    const authorNames = resolvePostAuthors(post).map((author) => author.name);

    return {
      id: post.slug || post.id,
      title: post.title,
      author: authorNames.length > 0 ? authorNames.join(', ') : 'unknown',
      coverImage: normalizeGhostAssetUrl(post.feature_image, { ghostContentOrigin }) ?? '/library/covers/sfera.png',
      description: post.custom_excerpt || post.excerpt || '',
      longDescription: post.excerpt || post.custom_excerpt || '',
      pdfUrl,
      publishedYear,
      language: 'english',
    };
  });
};

export const fetchBookById = async (id: string): Promise<LibraryBook | undefined> => {
  const books = await fetchLibraryBooks();
  return books.find((book) => book.id === id);
};
