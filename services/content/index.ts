import type { ContentProvider } from './types';
import { LocalContentProvider } from './providers/local';
import { GhostContentProvider } from './providers/ghost';

let singletonProvider: ContentProvider | null = null;

const resolveProvider = (): ContentProvider => {
  const selected = process.env.CONTENT_PROVIDER ?? 'local';

  if (selected === 'ghost') {
    try {
      return new GhostContentProvider();
    } catch (error) {
      // this keeps local dev stable and gives a clear message when ghost config is incomplete
      console.error('[content] ghost provider initialization failed');
      if (error instanceof Error) {
        console.error(`[content] ${error.message}`);
      }
      throw error;
    }
  }

  if (selected !== 'local') {
    // unknown values should not crash app startup in local mode
    console.warn(`[content] unsupported content_provider "${selected}", falling back to local`);
  }

  return new LocalContentProvider();
};

const getProvider = () => {
  if (!singletonProvider) {
    singletonProvider = resolveProvider();
  }
  return singletonProvider;
};

export const fetchArticles: ContentProvider['fetchArticles'] = (...args) => getProvider().fetchArticles(...args);
export const fetchArticleById: ContentProvider['fetchArticleById'] = (...args) => getProvider().fetchArticleById(...args);
export const fetchTeamMembers: ContentProvider['fetchTeamMembers'] = (...args) => getProvider().fetchTeamMembers(...args);
export const fetchLibraryBooks: ContentProvider['fetchLibraryBooks'] = (...args) => getProvider().fetchLibraryBooks(...args);
export const fetchBookById: ContentProvider['fetchBookById'] = (...args) => getProvider().fetchBookById(...args);

export { getProvider };
export type { ContentProvider } from './types';
export type { ArticleKind, PaginatedResult, PaginationInput } from './types';

