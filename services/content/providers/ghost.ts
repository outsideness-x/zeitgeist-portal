import { cache } from 'react';
import type { Article, LibraryBook, TeamMember } from '@/types';
import type { ArticleKind, ContentProvider, PaginatedResult, PaginationInput } from '../types';

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
  published_at: string;
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
  next: number | null;
  prev: number | null;
};

type GhostPostListResponse = {
  posts: GhostPost[];
  meta: { pagination: GhostMetaPagination };
};

type GhostPostSingleResponse = {
  posts: GhostPost[];
};

const DEFAULT_REVALIDATE_SECONDS = Number(process.env.GHOST_REVALIDATE_SECONDS ?? 120);

const normalizePagination = (input?: PaginationInput) => {
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, input?.pageSize ?? 10));
  return { page, pageSize };
};

export class GhostContentProvider implements ContentProvider {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(config?: { apiUrl?: string; apiKey?: string }) {
    this.apiUrl = config?.apiUrl ?? process.env.GHOST_CONTENT_API_URL ?? '';
    this.apiKey = config?.apiKey ?? process.env.GHOST_CONTENT_API_KEY ?? '';

    if (!this.apiUrl || !this.apiKey) {
      throw new Error(
        'ghost provider requires ghost_content_api_url and ghost_content_api_key when content_provider=ghost',
      );
    }
  }

  // this request helper keeps ghost fetches in next cache with explicit tags for future invalidation
  private async request<T>(path: string, tags: string[]): Promise<T> {
    const url = new URL(path, this.apiUrl);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString(), {
      next: {
        revalidate: DEFAULT_REVALIDATE_SECONDS,
        tags,
      },
    });

    if (!response.ok) {
      const details = await response.text().catch(() => 'unknown');
      throw new Error(`ghost request failed with status ${response.status}: ${details}`);
    }

    return (await response.json()) as T;
  }

  private mapGhostPostToArticle(post: GhostPost): Article {
    const tags = post.tags?.map((tag) => tag.name) ?? [];
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
      content: post.html ?? undefined,
      feature_image: post.feature_image ?? undefined,
      published_at: post.published_at,
      authors:
        post.authors?.map((author) => ({
          id: author.id,
          name: author.name,
          avatar: author.profile_image ?? undefined,
        })) ?? [],
      tags,
      reading_time: post.reading_time ?? undefined,
      type,
      pdfUrl: post.canonical_url?.toLowerCase().endsWith('.pdf') ? post.canonical_url : undefined,
    };
  }

  fetchArticles = cache(async (type?: ArticleKind, pagination?: PaginationInput): Promise<PaginatedResult<Article>> => {
    const { page, pageSize } = normalizePagination(pagination);
    const search = new URLSearchParams();
    search.set('include', 'authors,tags');
    search.set('limit', `${pageSize}`);
    search.set('page', `${page}`);

    if (type) {
      // content-type tags keep filtering simple for the app list views
      search.set('filter', `tag:${type}`);
    }

    const response = await this.request<GhostPostListResponse>(
      `/ghost/api/content/posts/?${search.toString()}`,
      ['ghost:posts', type ? `ghost:posts:${type}` : 'ghost:posts:all'],
    );

    return {
      items: response.posts.map((post) => this.mapGhostPostToArticle(post)),
      total: response.meta.pagination.total,
      page: response.meta.pagination.page,
      pageSize: response.meta.pagination.limit,
      totalPages: Math.max(1, response.meta.pagination.pages),
    };
  });

  fetchArticleById = cache(async (id: string): Promise<Article | undefined> => {
    const bySlug = await this.request<GhostPostSingleResponse>(
      `/ghost/api/content/posts/slug/${encodeURIComponent(id)}/?include=authors,tags&limit=1`,
      [`ghost:post:${id}`],
    ).catch(() => undefined);

    if (bySlug?.posts?.[0]) {
      return this.mapGhostPostToArticle(bySlug.posts[0]);
    }

    const byId = await this.request<GhostPostSingleResponse>(
      `/ghost/api/content/posts/${encodeURIComponent(id)}/?include=authors,tags`,
      [`ghost:post:${id}`],
    ).catch(() => undefined);

    if (byId?.posts?.[0]) {
      return this.mapGhostPostToArticle(byId.posts[0]);
    }

    return undefined;
  });

  fetchTeamMembers = cache(async (): Promise<TeamMember[]> => {
    const response = await this.request<GhostPostListResponse>(
      '/ghost/api/content/posts/?include=authors,tags&limit=50&filter=tag:team',
      ['ghost:team'],
    );

    return response.posts.map((post) => ({
      id: post.slug || post.id,
      name: post.title,
      role: post.tags?.find((tag) => tag.slug !== 'team')?.name ?? 'researcher',
      photoUrl: post.feature_image ?? undefined,
      bio: post.custom_excerpt || post.excerpt || '',
    }));
  });

  fetchLibraryBooks = cache(async (): Promise<LibraryBook[]> => {
    const response = await this.request<GhostPostListResponse>(
      '/ghost/api/content/posts/?include=authors,tags&limit=100&filter=tag:library',
      ['ghost:library'],
    );

    return response.posts.map((post) => {
      const publishedYear = post.published_at ? new Date(post.published_at).getFullYear().toString() : '';
      const canonicalPdf = post.canonical_url?.toLowerCase().endsWith('.pdf') ? post.canonical_url : '#';

      return {
        id: post.slug || post.id,
        title: post.title,
        author: post.authors?.[0]?.name ?? 'unknown',
        coverImage: post.feature_image ?? '/library/covers/sfera.png',
        description: post.custom_excerpt || post.excerpt || '',
        longDescription: post.excerpt || post.custom_excerpt || '',
        pdfUrl: canonicalPdf,
        publishedYear,
        language: 'english',
      };
    });
  });

  fetchBookById = cache(async (id: string): Promise<LibraryBook | undefined> => {
    const books = await this.fetchLibraryBooks();
    return books.find((book) => book.id === id);
  });
}
