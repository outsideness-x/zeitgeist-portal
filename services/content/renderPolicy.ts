import type { ContentFetchMeta } from './types';
import { trackPlaceholderBlocked } from './observability';

export type CardVisualState = 'content' | 'placeholder' | 'fallback';
export type CollectionVisualState = 'content' | 'empty' | 'error';

type CardVisualStateInput = {
  route: string;
  hasRenderableContent: boolean;
  requestPlaceholder: boolean;
  component: string;
  articleId?: string;
};

const normalizeRoute = (route: string) => {
  const trimmed = route.trim();
  if (!trimmed) {
    return '/';
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutQuery = normalized.split('?')[0]?.split('#')[0] ?? normalized;
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }

  return withoutQuery;
};

export const isLibraryRoute = (route: string) => {
  const normalizedRoute = normalizeRoute(route);
  return normalizedRoute === '/library' || normalizedRoute.startsWith('/library/');
};

export const allowCardPlaceholder = (route: string) => {
  return isLibraryRoute(route);
};

export const resolveCardVisualState = (input: CardVisualStateInput): CardVisualState => {
  if (input.hasRenderableContent) {
    return 'content';
  }

  if (input.requestPlaceholder && allowCardPlaceholder(input.route)) {
    return 'placeholder';
  }

  if (input.requestPlaceholder) {
    trackPlaceholderBlocked({
      route: normalizeRoute(input.route),
      component: input.component,
      articleId: input.articleId,
      reason: 'placeholder policy: library only',
    });
  }

  return 'fallback';
};

type CollectionStateInput = {
  itemsCount: number;
  fetchMeta: ContentFetchMeta;
};

export const resolveCollectionVisualState = (input: CollectionStateInput): CollectionVisualState => {
  if (input.itemsCount > 0) {
    return 'content';
  }

  if (input.fetchMeta.status === 'error') {
    return 'error';
  }

  if (input.fetchMeta.status === 'stale' && input.fetchMeta.reason) {
    return 'error';
  }

  return 'empty';
};
