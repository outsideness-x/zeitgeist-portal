import { cache } from 'react';
import type { Article, LibraryBook, TeamMember } from '@/types';
import type { ArticleKind, PaginatedResult, PaginationInput } from '@/services/content/types';

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

const ghostApiUrl = (process.env.GHOST_CONTENT_API_URL ?? '').trim();
const ghostApiKey = (process.env.GHOST_CONTENT_API_KEY ?? '').trim();
const defaultRevalidate = Number(process.env.GHOST_REVALIDATE_SECONDS ?? 120);
const revalidateSeconds = Number.isFinite(defaultRevalidate) && defaultRevalidate > 0 ? Math.floor(defaultRevalidate) : 120;

const isGhostEnabled = () => {
  return ghostApiUrl.length > 0 && ghostApiKey.length > 0;
};

const normalizePagination = (input?: PaginationInput) => {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, input?.pageSize ?? 10));
  return { page, pageSize };
};

const emptyPaginatedResult = <T,>(pagination?: PaginationInput): PaginatedResult<T> => {
  const { pageSize } = normalizePagination(pagination);
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
  };
};

const mapPostToArticle = (post: GhostPost): Article => {
  const tags = post.tags?.map((tag) => tag.slug) ?? [];
  const type: ArticleKind = tags.includes('research')
    ? 'research'
    : tags.includes('nova')
      ? 'nova'
      : 'journal';

  return {
    id: post.slug || post.id,
    source: 'ghost',
    externalId: post.id,
    slug: post.slug || post.id,
    canonicalPath: `/article/${post.slug || post.id}`,
    title: post.title,
    excerpt: post.custom_excerpt || post.excerpt || '',
    html: post.html ?? undefined,
    feature_image: post.feature_image ?? undefined,
    published_at: post.published_at || new Date(0).toISOString(),
    authors: post.authors?.map((author) => ({
      id: author.id,
      name: author.name,
      avatar: author.profile_image ?? undefined,
    })) ?? [],
    tags: post.tags?.map((tag) => tag.name) ?? [],
    reading_time: post.reading_time ?? undefined,
    baseLikeCount: 0,
    type,
  };
};

const requestGhost = async <T>(path: string, query: URLSearchParams): Promise<T | undefined> => {
  if (!isGhostEnabled()) {
    return undefined;
  }

  try {
    const url = new URL(path, ghostApiUrl);
    url.searchParams.set('key', ghostApiKey);

    query.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      next: {
        revalidate: revalidateSeconds,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as T;
  } catch {
    return undefined;
  }
};

const fetchPostBySlug = cache(async (slug: string): Promise<GhostPost | undefined> => {
  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '1');

  const response = await requestGhost<GhostPostSingleResponse>(
    `/ghost/api/content/posts/slug/${encodeURIComponent(slug)}/`,
    query,
  );

  return response?.posts?.[0];
});

const fetchPostById = cache(async (id: string): Promise<GhostPost | undefined> => {
  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '1');

  const response = await requestGhost<GhostPostSingleResponse>(
    `/ghost/api/content/posts/${encodeURIComponent(id)}/`,
    query,
  );

  return response?.posts?.[0];
});

const fetchArticlesCached = cache(async (
  type: ArticleKind | undefined,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Article>> => {
  if (!isGhostEnabled()) {
    return emptyPaginatedResult<Article>({ page, pageSize });
  }

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

  if (!response) {
    return emptyPaginatedResult<Article>({ page, pageSize });
  }

  const items = response.posts.map((post) => mapPostToArticle(post));
  const meta = response.meta?.pagination;

  return {
    items,
    total: meta?.total ?? items.length,
    page: meta?.page ?? page,
    pageSize: meta?.limit ?? pageSize,
    totalPages: Math.max(1, meta?.pages ?? 1),
  };
});

export const fetchArticles = async (
  type?: ArticleKind,
  pagination?: PaginationInput,
): Promise<PaginatedResult<Article>> => {
  const { page, pageSize } = normalizePagination(pagination);
  return fetchArticlesCached(type, page, pageSize);
};

export const fetchArticleById = cache(async (id: string): Promise<Article | undefined> => {
  if (!isGhostEnabled()) {
    return undefined;
  }

  const bySlug = await fetchPostBySlug(id);
  if (bySlug) {
    return mapPostToArticle(bySlug);
  }

  const byId = await fetchPostById(id);
  if (byId) {
    return mapPostToArticle(byId);
  }

  return undefined;
});

export const fetchTeamMembers = cache(async (): Promise<TeamMember[]> => {
  if (!isGhostEnabled()) {
    return [];
  }

  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '100');
  query.set('filter', 'tag:team');

  const response = await requestGhost<GhostPostListResponse>(
    '/ghost/api/content/posts/',
    query,
  );

  if (!response) {
    return [];
  }

  return response.posts.map((post) => ({
    id: post.slug || post.id,
    name: post.title,
    role: post.tags?.find((tag) => tag.slug !== 'team')?.name ?? 'researcher',
    photoUrl: post.feature_image ?? undefined,
    bio: post.custom_excerpt || post.excerpt || '',
  }));
});

export const fetchLibraryBooks = cache(async (): Promise<LibraryBook[]> => {
  if (!isGhostEnabled()) {
    return [];
  }

  const query = new URLSearchParams();
  query.set('include', 'authors,tags');
  query.set('limit', '100');
  query.set('filter', 'tag:library');

  const response = await requestGhost<GhostPostListResponse>(
    '/ghost/api/content/posts/',
    query,
  );

  if (!response) {
    return [];
  }

  return response.posts.map((post) => {
    const publishedYear = post.published_at ? new Date(post.published_at).getUTCFullYear().toString() : '';
    const pdfUrl = post.canonical_url?.toLowerCase().endsWith('.pdf') ? post.canonical_url : '';

    return {
      id: post.slug || post.id,
      title: post.title,
      author: post.authors?.[0]?.name ?? 'unknown',
      coverImage: post.feature_image ?? '/library/covers/sfera.png',
      description: post.custom_excerpt || post.excerpt || '',
      longDescription: post.excerpt || post.custom_excerpt || '',
      pdfUrl,
      publishedYear,
      language: 'english',
    };
  });
});

export const fetchBookById = cache(async (id: string): Promise<LibraryBook | undefined> => {
  const books = await fetchLibraryBooks();
  return books.find((book) => book.id === id);
});
