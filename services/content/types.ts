import type { Article, LibraryBook, TeamMember } from '@/types';

export type ArticleKind = 'journal' | 'research' | 'nova';

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export interface ContentProvider {
  fetchArticles(type?: ArticleKind, pagination?: PaginationInput): Promise<PaginatedResult<Article>>;
  fetchArticleById(id: string): Promise<Article | undefined>;
  fetchTeamMembers(): Promise<TeamMember[]>;
  fetchLibraryBooks(): Promise<LibraryBook[]>;
  fetchBookById(id: string): Promise<LibraryBook | undefined>;
}

