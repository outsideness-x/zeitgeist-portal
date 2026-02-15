import type { ContentProvider } from './types';
import {
  fetchArticles as fetchGhostArticles,
  fetchArticleById as fetchGhostArticleById,
  fetchTeamMembers as fetchGhostTeamMembers,
  fetchLibraryBooks as fetchGhostLibraryBooks,
  fetchBookById as fetchGhostBookById,
} from '@/services/ghostService';

export const fetchArticles: ContentProvider['fetchArticles'] = (...args) => fetchGhostArticles(...args);
export const fetchArticleById: ContentProvider['fetchArticleById'] = (...args) => fetchGhostArticleById(...args);
export const fetchTeamMembers: ContentProvider['fetchTeamMembers'] = (...args) => fetchGhostTeamMembers(...args);
export const fetchLibraryBooks: ContentProvider['fetchLibraryBooks'] = (...args) => fetchGhostLibraryBooks(...args);
export const fetchBookById: ContentProvider['fetchBookById'] = (...args) => fetchGhostBookById(...args);

export type { ContentProvider } from './types';
export type { ArticleKind, PaginatedResult, PaginationInput } from './types';
